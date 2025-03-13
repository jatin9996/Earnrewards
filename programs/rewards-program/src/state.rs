use anchor_lang::prelude::*;

#[account]
pub struct UserRewardHistory {
    pub user: Pubkey,
    pub reward_amount: u64,
    pub activity_type: String,
    pub timestamp: i64,
}
