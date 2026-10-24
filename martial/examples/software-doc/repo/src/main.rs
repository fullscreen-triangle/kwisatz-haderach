// A toy program for martial's software-doc example. It is never built.

struct Config {
    dry_run: bool,
}

fn load_config(args: &[String]) -> Config {
    Config { dry_run: args.iter().any(|a| a == "--dry-run") }
}

fn run_all(config: &Config) {
    if config.dry_run {
        println!("would write");
    }
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    run_all(&load_config(&args));
}
