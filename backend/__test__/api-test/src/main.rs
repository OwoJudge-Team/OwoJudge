use api_test::user_api_tests::random_user_api_calls;

#[tokio::main]
async fn main() {
    // Run the random request workload (10k requests) and print throughput.
    random_user_api_calls(32_000).await;
}