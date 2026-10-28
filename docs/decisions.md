# Scope and decisions

- One permanently located repository; dated chat workspaces are not project roots.
- Native ESM under NodeNext; retain Jest using ts-jest's ESM preset because the
  design document requires Jest. Jest itself still uses the VM-module flag.
- Deliver one small, explained increment at a time. The full PDF is a roadmap.
- Simulator-only implementation; preserve a stable trading-side adapter contract.
  A replacement with different semantics is not guaranteed to be a one-file change.
- One application, shared banking logic, ICICI/HDFC/SBI databases, TypeORM later.
- Healthy banks remain available if another database is unavailable at startup or
  later. Retry unavailable connections; invalid configuration fails startup.
- An already-debited cross-bank transfer stays pending during destination outages.
- Basic eligibility checks precede OTP creation. Persist business rejection for
  idempotent retries; NOT_REQUIRED can represent approval skipped due to rejection.
- Later inbox schema: separate nullable test OTP, not duplicated in message prose;
  clear it on use/replacement/expiry/lockout. Verification uses a protected digest.
- Seller organizations receive purchase payments and fund buybacks. Debit authority
  must be explicit and account-scoped. Integration ownership remains to be designed.
- Six intended simulators: banking, identity/KYC, market prices, Demat depository,
  PAN/name verification, and exchange/broker execution. Demat is deferred. Do not
  assume a seventh seller service. A fill is distinct from bank settlement.
- Webhook replay retry budgets and cash/overflow bounds remain deferred decisions.
- Core tables come first; all eight application tables are not part of this scaffold.

Current scope: Fastify HTTP scaffold only. Authentication, configuration validation,
readiness, persistence, migrations, seeds and business workflows are not implemented.
