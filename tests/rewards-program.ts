import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { RewardsProgram } from "../target/types/rewards_program";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";

describe("rewards-program", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.rewardsProgram as Program<RewardsProgram>;
  const provider = anchor.getProvider();

  // Helper function to create a new user keypair
  const createUser = () => anchor.web3.Keypair.generate();

  // Helper function to calculate expected reward
  const calculateExpectedReward = (baseReward: number, numTasks: number, numUsers: number): number => {
    let multiplier = 1.0;
    if (numTasks > numUsers) multiplier = 1.2; // 20% increase
    if (numUsers > numTasks) multiplier = 0.9; // 10% decrease
    return baseReward * multiplier;
  };

  describe("Demand-Supply Mechanics", () => {
    it("More Tasks Than Users - High Demand", async () => {
      const user = createUser();
      const activity = "Check-in";
      const numTasks = 100;
      const numUsers = 50;

      const rewardHistory = anchor.web3.Keypair.generate();
      const baseReward = 0.01; // Base reward for Check-in

      await program.methods
        .initializeRewardHistory(
          user.publicKey,
          activity,
          new anchor.BN(numTasks),
          new anchor.BN(numUsers)
        )
        .accounts({
          rewardHistory: rewardHistory.publicKey,
          user: user.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user, rewardHistory])
        .rpc();

      const account = await program.account.rewardHistory.fetch(rewardHistory.publicKey);
      const expectedReward = calculateExpectedReward(baseReward, numTasks, numUsers);
      
      expect(account.rewardAmount).to.be.closeTo(
        expectedReward * 100, // Convert to lamports
        1 // Allow small rounding difference
      );
    });

    it("More Users Than Tasks - Low Demand", async () => {
      const user = createUser();
      const activity = "Check-in";
      const numTasks = 50;
      const numUsers = 100;

      const rewardHistory = anchor.web3.Keypair.generate();
      const baseReward = 0.01;

      await program.methods
        .initializeRewardHistory(
          user.publicKey,
          activity,
          new anchor.BN(numTasks),
          new anchor.BN(numUsers)
        )
        .accounts({
          rewardHistory: rewardHistory.publicKey,
          user: user.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user, rewardHistory])
        .rpc();

      const account = await program.account.rewardHistory.fetch(rewardHistory.publicKey);
      const expectedReward = calculateExpectedReward(baseReward, numTasks, numUsers);
      
      expect(account.rewardAmount).to.be.closeTo(
        expectedReward * 100,
        1
      );
    });

    it("Balanced Demand-Supply", async () => {
      const user = createUser();
      const activity = "Check-in";
      const numTasks = 100;
      const numUsers = 100;

      const rewardHistory = anchor.web3.Keypair.generate();
      const baseReward = 0.01;

      await program.methods
        .initializeRewardHistory(
          user.publicKey,
          activity,
          new anchor.BN(numTasks),
          new anchor.BN(numUsers)
        )
        .accounts({
          rewardHistory: rewardHistory.publicKey,
          user: user.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user, rewardHistory])
        .rpc();

      const account = await program.account.rewardHistory.fetch(rewardHistory.publicKey);
      const expectedReward = calculateExpectedReward(baseReward, numTasks, numUsers);
      
      expect(account.rewardAmount).to.be.closeTo(
        expectedReward * 100,
        1
      );
    });
  });

  describe("Anti-Farming Mechanics", () => {
    it("Progressive Farming Penalty", async () => {
      const user = createUser();
      const activity = "Check-in";
      const numTasks = 100;
      const numUsers = 100;
      const baseReward = 0.01;

      const rewardHistory = anchor.web3.Keypair.generate();

      // Perform the same activity multiple times
      for (let i = 0; i < 5; i++) {
        await program.methods
          .initializeRewardHistory(
            user.publicKey,
            activity,
            new anchor.BN(numTasks),
            new anchor.BN(numUsers)
          )
          .accounts({
            rewardHistory: rewardHistory.publicKey,
            user: user.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([user, rewardHistory])
          .rpc();

        const account = await program.account.rewardHistory.fetch(rewardHistory.publicKey);
        
        // Verify consecutive count increases
        expect(account.consecutiveCount).to.equal(i + 1);

        // Verify reward reduction
        if (i >= 2) { // After 3rd consecutive time
          const expectedReward = (baseReward * 100) / Math.pow(2, i - 1);
          expect(account.rewardAmount).to.be.closeTo(expectedReward, 1);
        }
      }
    });

    it("Task Switching Resets Penalty", async () => {
      const user = createUser();
      const activity1 = "Check-in";
      const activity2 = "View Analytics";
      const numTasks = 100;
      const numUsers = 100;

      const rewardHistory = anchor.web3.Keypair.generate();

      // Perform first activity multiple times
      for (let i = 0; i < 3; i++) {
        await program.methods
          .initializeRewardHistory(
            user.publicKey,
            activity1,
            new anchor.BN(numTasks),
            new anchor.BN(numUsers)
          )
          .accounts({
            rewardHistory: rewardHistory.publicKey,
            user: user.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([user, rewardHistory])
          .rpc();
      }

      // Switch to second activity
      await program.methods
        .initializeRewardHistory(
          user.publicKey,
          activity2,
          new anchor.BN(numTasks),
          new anchor.BN(numUsers)
        )
        .accounts({
          rewardHistory: rewardHistory.publicKey,
          user: user.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user, rewardHistory])
        .rpc();

      const account = await program.account.rewardHistory.fetch(rewardHistory.publicKey);
      
      // Verify consecutive count resets
      expect(account.consecutiveCount).to.equal(1);
    });
  });

  describe("Dynamic Task and User Simulation", () => {
    it("Simulates Random Task Availability and User Changes", async () => {
      const user = createUser();
      const activity = "Check-in";
      const baseReward = 0.01;

      const rewardHistory = anchor.web3.Keypair.generate();

      // Simulate different scenarios over time
      const scenarios = [
        { tasks: 100, users: 50 }, // High demand
        { tasks: 50, users: 100 }, // Low demand
        { tasks: 100, users: 100 }, // Balanced
      ];

      for (const scenario of scenarios) {
        await program.methods
          .initializeRewardHistory(
            user.publicKey,
            activity,
            new anchor.BN(scenario.tasks),
            new anchor.BN(scenario.users)
          )
          .accounts({
            rewardHistory: rewardHistory.publicKey,
            user: user.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([user, rewardHistory])
          .rpc();

        const account = await program.account.rewardHistory.fetch(rewardHistory.publicKey);
        const expectedReward = calculateExpectedReward(
          baseReward,
          scenario.tasks,
          scenario.users
        );

        expect(account.rewardAmount).to.be.closeTo(expectedReward * 100, 1);
      }
    });
  });
});
