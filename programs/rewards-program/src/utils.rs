pub fn apply_anti_farming_penalty(previous_tasks: Vec<String>, reward: u64) -> u64 {
    let last_three = previous_tasks.iter().rev().take(3).collect::<Vec<_>>();

    if last_three.iter().all(|&t| t == last_three[0]) {
        return reward / 2;
    }
    
    reward
}
