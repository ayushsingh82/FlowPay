/// FlowPay — Access control & emergency pause (OpenZeppelin patterns on Sui)
///
/// Implements OZ-style guardrails adapted to Sui's object/capability model:
///   * `AdminCap`  — an owned capability that gates privileged ops (mirrors
///                   OZ `Ownable` / `AccessControl` admin role).
///   * `Pause`     — a shared switch checked by every entry function; flipping
///                   it halts *all* flows atomically (mirrors OZ `Pausable`).
///
/// INTEGRATION: OpenZeppelin — this is the Move adaptation of OZ's
///   Ownable / AccessControl / Pausable. Roles can be extended to a
///   `Table<address, vector<u8>>` role-bitmap if multi-role is needed.
module flowpay::access_control {
    use sui::event;

    // ===== Errors =====
    const EPaused: u64 = 1;
    const ENotPaused: u64 = 2;

    /// Owned admin capability. Whoever holds it can perform privileged actions
    /// (push prices, pause, tune risk params, mint cashback supply, etc.).
    public struct AdminCap has key, store {
        id: UID,
    }

    /// Shared emergency-stop switch. Every state-changing entry function reads
    /// `assert_not_paused(pause)` first.
    public struct Pause has key {
        id: UID,
        paused: bool,
    }

    // ===== Events =====
    public struct Paused has copy, drop { by: address }
    public struct Unpaused has copy, drop { by: address }

    /// On publish: mint the AdminCap to the deployer and share the Pause object
    /// (initially un-paused).
    fun init(ctx: &mut TxContext) {
        transfer::transfer(AdminCap { id: object::new(ctx) }, ctx.sender());
        transfer::share_object(Pause { id: object::new(ctx), paused: false });
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx)
    }

    #[test_only]
    /// Mint a standalone AdminCap for unit tests.
    public fun mint_admin_for_testing(ctx: &mut TxContext): AdminCap {
        AdminCap { id: object::new(ctx) }
    }

    // ===== Pausable =====

    /// Flip the emergency switch on. Admin only.
    public fun pause(_admin: &AdminCap, pause: &mut Pause, ctx: &TxContext) {
        pause.paused = true;
        event::emit(Paused { by: ctx.sender() });
    }

    /// Resume operations. Admin only.
    public fun unpause(_admin: &AdminCap, pause: &mut Pause, ctx: &TxContext) {
        pause.paused = false;
        event::emit(Unpaused { by: ctx.sender() });
    }

    /// Guard used by every entry function. Aborts with `EPaused` when halted.
    public fun assert_not_paused(pause: &Pause) {
        assert!(!pause.paused, EPaused);
    }

    public fun assert_paused(pause: &Pause) {
        assert!(pause.paused, ENotPaused);
    }

    public fun is_paused(pause: &Pause): bool { pause.paused }
}
