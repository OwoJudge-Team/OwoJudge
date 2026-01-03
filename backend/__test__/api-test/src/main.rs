use api_test::user_api_tests::random_user_api_calls;
use api_test::problem_api_tests::random_problem_api_calls;
use api_test::contest_api_tests::random_contest_api_calls;
use api_test::submission_api_tests::random_submission_api_calls;

#[tokio::main]
async fn main() {
    println!("--- Starting User API Stress Test ---");
    random_user_api_calls(32_000).await;
    
    tokio::time::sleep(tokio::time::Duration::from_secs(10)).await;
    
    println!("\n--- Starting Problem API Stress Test ---");
    random_problem_api_calls(10_000).await;

    tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;

    println!("\n--- Starting Contest API Stress Test ---");
    random_contest_api_calls(10_000).await;

    tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;

    println!("\n--- Starting Submission API Stress Test ---");
    random_submission_api_calls(10_000).await;
}