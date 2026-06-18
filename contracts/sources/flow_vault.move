/// FlowPay — FlowVault
///
/// The user's multi-asset vault. Deposits route into the Scallop lending
/// adapter and are tracked as sCoin (yield-bearing) accounting tokens, so idle
/// balance keeps earning APY. One `FlowVault` object per user (owned object).
///
/// Sponsor map:
///   * Scallop  — every deposit becomes an sCoin position (yield engine).
///   * OpenZeppelin — `Pause` guard on every mutating entry; vault is an owned
///     object so only the holder can act on it.
module flowpay::flow_vault {
    use sui::coin::Coin;
    use sui::table::{Self, Table};
    use sui::event;
    use std::type_name::{Self, TypeName};

    use flowpay::lending::{Self, LendingMarket, SCoin};
    use flowpay::access_control::{Self, Pause};

    // ===== Errors =====
    const ENoPosition: u64 = 1;
    const EInsufficient: u64 = 2;

    /// Per-user multi-asset vault. sCoin positions live in dynamic fields keyed
    /// by the underlying asset `TypeName`; `assets` tracks which are present.
    public struct FlowVault has key, store {
        id: UID,
        owner: address,
        /// set of asset TypeNames currently held
        assets: Table<TypeName, bool>,
    }

    // ===== Events =====
    public struct VaultCreated has copy, drop { vault: ID, owner: address }
    public struct DepositEvent has copy, drop {
        vault: ID,
        asset: TypeName,
        amount: u64,
    }
    public struct WithdrawEvent has copy, drop {
        vault: ID,
        asset: TypeName,
        amount: u64,
    }

    use sui::dynamic_field as df;

    /// Create a fresh vault owned by the caller.
    public fun new(ctx: &mut TxContext): FlowVault {
        let vault = FlowVault {
            id: object::new(ctx),
            owner: ctx.sender(),
            assets: table::new<TypeName, bool>(ctx),
        };
        event::emit(VaultCreated { vault: object::id(&vault), owner: ctx.sender() });
        vault
    }

    /// Convenience entry: create a vault and transfer it to the caller.
    public entry fun create(ctx: &mut TxContext) {
        let vault = new(ctx);
        transfer::public_transfer(vault, ctx.sender());
    }

    /// Deposit `coin` of asset `T`. Routed into Scallop, stored as sCoin.
    public fun deposit<T>(
        vault: &mut FlowVault,
        market: &mut LendingMarket,
        pause: &Pause,
        coin: Coin<T>,
    ) {
        access_control::assert_not_paused(pause);
        let amount = sui::coin::value(&coin);
        let scoin = lending::deposit<T>(market, coin);
        let key = type_name::get<T>();
        if (df::exists_(&vault.id, key)) {
            let existing = df::borrow_mut<TypeName, SCoin<T>>(&mut vault.id, key);
            lending::join_scoin<T>(existing, scoin);
        } else {
            df::add(&mut vault.id, key, scoin);
            table::add(&mut vault.assets, key, true);
        };
        event::emit(DepositEvent { vault: object::id(vault), asset: key, amount });
    }

    /// Withdraw `amount` (in sCoin units) of asset `T` back to the caller as a
    /// spendable Coin<T>. Returns the coin so it can be used inside a PTB.
    public fun withdraw<T>(
        vault: &mut FlowVault,
        market: &mut LendingMarket,
        pause: &Pause,
        scoin_amount: u64,
        ctx: &mut TxContext,
    ): Coin<T> {
        access_control::assert_not_paused(pause);
        let key = type_name::get<T>();
        assert!(df::exists_(&vault.id, key), ENoPosition);
        let position = df::borrow_mut<TypeName, SCoin<T>>(&mut vault.id, key);
        assert!(lending::scoin_amount<T>(position) >= scoin_amount, EInsufficient);
        let taken = lending::split_scoin<T>(position, scoin_amount);
        let coin = lending::withdraw<T>(market, taken, ctx);
        event::emit(WithdrawEvent {
            vault: object::id(vault),
            asset: key,
            amount: sui::coin::value(&coin),
        });
        coin
    }

    /// Internal helper used by SmartRouter: pull a Coin<T> worth `scoin_amount`
    /// sCoin out of the vault (pause already checked by caller's entry fn).
    public(package) fun take<T>(
        vault: &mut FlowVault,
        market: &mut LendingMarket,
        scoin_amount: u64,
        ctx: &mut TxContext,
    ): Coin<T> {
        let key = type_name::get<T>();
        assert!(df::exists_(&vault.id, key), ENoPosition);
        let position = df::borrow_mut<TypeName, SCoin<T>>(&mut vault.id, key);
        assert!(lending::scoin_amount<T>(position) >= scoin_amount, EInsufficient);
        let taken = lending::split_scoin<T>(position, scoin_amount);
        lending::withdraw<T>(market, taken, ctx)
    }

    // ===== Views =====

    /// sCoin balance held for asset `T` (0 if none).
    public fun scoin_balance<T>(vault: &FlowVault): u64 {
        let key = type_name::get<T>();
        if (!df::exists_(&vault.id, key)) return 0;
        lending::scoin_amount<T>(df::borrow<TypeName, SCoin<T>>(&vault.id, key))
    }

    /// Underlying (redeemable) balance of asset `T`, accounting for accrued APY.
    public fun underlying_balance<T>(vault: &FlowVault, market: &LendingMarket): u64 {
        let key = type_name::get<T>();
        if (!df::exists_(&vault.id, key)) return 0;
        lending::scoin_to_underlying<T>(market, df::borrow<TypeName, SCoin<T>>(&vault.id, key))
    }

    public fun has_asset<T>(vault: &FlowVault): bool {
        df::exists_(&vault.id, type_name::get<T>())
    }

    public fun owner(vault: &FlowVault): address { vault.owner }
}
