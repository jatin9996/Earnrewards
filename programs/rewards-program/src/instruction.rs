use anchor_lang::prelude::*;
use crate::state::UserRewardHistory;


#[derive(Accounts)]
pub struct SelectActivity<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(init, payer = user, space = 8 + 32 + 8 + 40 + 8)]
    pub user_history: Account<'info, UserRewardHistory>,

    pub system_program: Program<'info, System>,
}

pub fn select_activity(ctx: Context<SelectActivity>, activity: String) -> Result<()> {
    let user_history = &mut ctx.accounts.user_history;
    user_history.user = ctx.accounts.user.key();
    user_history.activity_type = activity.clone();
    user_history.timestamp = Clock::get()?.unix_timestamp;

    // Compute dynamic reward
    user_history.reward_amount = compute_dynamic_reward(&activity);

    Ok(())
}

fn compute_dynamic_reward(activity: &String) -> u64 {
    let base_reward = match activity.as_str() {
        "Check-in" | "View Analytics" => 10_000_000,  // 0.01 SOL
        "Cast a Vote" | "Refer a User" => 50_000_000, // 0.05 SOL
        "Deploy a Contract" | "Stake SOL" => 100_000_000, // 0.1 SOL
        _ => 5_000_000,  // Default case
    };

    base_reward
}
