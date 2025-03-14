use anchor_lang::prelude::*;
use anchor_lang::solana_program::pubkey::Pubkey;
use rand::Rng;
use std::thread;
use std::time::Duration;

declare_id!("5boDdMTzUdfXJEybG8uiV65ab5Mcjo4qJwsv9uGPxgsp");

// Define a list of eligible activities
const ELIGIBLE_ACTIVITIES: &[&str] = &["activity1", "activity2", "activity3"];

// Define a mapping of activity types to their base rewards
const ACTIVITY_BASE_REWARDS: &[(&str, f64)] = &[
    ("Check-in", 0.01),
    ("View Analytics", 0.01),
    ("Vote in a Poll", 0.01),
    ("Subscribe to a Smart Contract", 0.01),
    ("Leave Feedback on a dApp", 0.01),
    ("Complete a Profile Setup", 0.01),
    ("Cast a Vote", 0.05),
    ("Send a Message", 0.05),
    ("Refer a User", 0.05),
    ("Complete a Tutorial on Solana Usage", 0.05),
    ("Test a Beta Feature on a dApp", 0.05),
    ("Review a Smart Contract's Code", 0.05),
    ("Deploy a Sample Smart Contract", 0.1),
    ("Stake SOL for at Least 7 Days", 0.1),
    ("Mint and Transfer an NFT", 0.1),
    ("Provide Liquidity to a Protocol", 0.1),
    ("Run a Validator Node for 24 Hours", 0.1),
    ("Contribute Code to an Open-Source Project", 0.1),
];

// Function to calculate reward amount based on demand-supply mechanics
fn calculate_reward_amount(activity: &str, num_tasks: u64, num_users: u64) -> u64 {
    let base_reward = ACTIVITY_BASE_REWARDS
        .iter()
        .find(|&&(a, _)| a == activity)
        .map(|&(_, reward)| reward)
        .unwrap_or(0.0);

    let multiplier = if num_tasks > num_users {
        1.2 // Increase reward by 20%
    } else if num_users > num_tasks {
        0.9 // Decrease reward by 10%
    } else {
        1.0
    };
    (base_reward * multiplier * 100.0) as u64 // Convert SOL to lamports
}

// Function to determine task availability using RNG
fn determine_task_availability() -> bool {
    let mut rng = rand::thread_rng();
    rng.gen_bool(0.5) // 50% chance of being available
}

// Function to periodically update task availability
fn update_task_availability() {
    thread::spawn(move || {
        loop {
            let available = determine_task_availability();
            // Update task status here
            println!("Task is {}", if available { "available" } else { "unavailable" });
            thread::sleep(Duration::from_secs(10));
        }
    });
}

// Ensure the update_task_availability function is running
fn start_task_availability_update() {
    update_task_availability();
}

// Call this function to start the periodic task availability update
// start_task_availability_update();

// Function to handle user cooldown
fn user_cooldown() {
    thread::sleep(Duration::from_secs(5)); // 5 seconds cooldown
}

#[program]
pub mod rewards_program {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        start_task_availability_update();
        Ok(())
    }

    pub fn initialize_reward_history(ctx: Context<InitializeRewardHistory>, user: Pubkey, activity: String, num_tasks: u64, num_users: u64) -> Result<()> {
        if !ACTIVITY_BASE_REWARDS.iter().any(|&(a, _)| a == activity) {
            return Err(ProgramError::InvalidArgument.into());
        }
        let reward_history = &mut ctx.accounts.reward_history;
        reward_history.user = user;
        reward_history.activity = activity.clone();
        
        // Check for consecutive task selection
        if reward_history.last_activity == activity {
            reward_history.consecutive_count += 1;
        } else {
            reward_history.consecutive_count = 1;
        }
        reward_history.last_activity = activity;

        // Apply anti-farming reward reduction
        let mut reward_amount = calculate_reward_amount(&activity, num_tasks, num_users);
        if reward_history.consecutive_count >= 3 {
            reward_amount /= 2u64.pow((reward_history.consecutive_count - 2) as u32);
        }
        reward_history.reward_amount = reward_amount;
        reward_history.rewards.push(reward_amount);

        // Apply user cooldown
        user_cooldown();

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

#[derive(Accounts)]
pub struct InitializeRewardHistory<'info> {
    #[account(init, payer = user, space = 8 + 32 + 4 + 100 * 8 + 4 + 100 + 4 + 100)]
    pub reward_history: Account<'info, RewardHistory>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
#[account]
pub struct RewardHistory {
    pub user: Pubkey,
    pub activity: String,
    pub reward_amount: u64,
    pub rewards: Vec<u64>,
    pub timestamp: i64,
    pub last_activity: String,
    pub consecutive_count: u64,
}
