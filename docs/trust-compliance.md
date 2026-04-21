# Trust, Safety, and Compliance Baseline

This project now includes a compliance-first foundation for the adult creator MVP.

## Identity and Age Controls
- `profiles.is_age_verified` gates sensitive experiences.
- `creators.is_kyc_verified` and `creators.can_publish_sensitive` gate creator publishing.
- Creator post insertion policy requires KYC verification.

## Publishing Policy
- Verified creators can publish directly without admin pre-approval.
- Free posts are public by default.
- Paid/private post access is controlled by `post_access_grants`.

## Platform Safety Operations
- Report intake via `moderation_reports`.
- Admin moderation and finance workflows are handled in the admin web app route (`/admin-web`).
- Auditability table: `admin_audit_logs`.

## Payments and Custody
- Funds are held by the platform model using `wallet_accounts`, `wallet_transactions`, and `withdrawal_requests`.
- Withdrawal requests require admin approval lifecycle states.

## Recommended Production Hardening
- Add external KYC provider verification callbacks.
- Add payment processor webhook reconciliation for payout states.
- Add automatic risk scoring for account freezes and manual holds.
