use anchor_lang::prelude::*;

declare_id!("5boDdMTzUdfXJEybG8uiV65ab5Mcjo4qJwsv9uGPxgsp");

#[program]
pub mod rewards_program {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
