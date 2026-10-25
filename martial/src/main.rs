use std::io::Read;
use std::path::PathBuf;
use std::process::ExitCode;

use martial::doc::Format;
use martial::profile::Profile;
use martial::Request;

const USAGE: &str = "usage:
  martial check FILE|- [--profile manuscript|software-doc|general] [--format md|tex]
                [--sidecar FILE] [--no-sidecar] [--sources DIR] [--repo DIR] [--against OLD]
                [--json | --annotate github]
  martial claims FILE|- [--profile P] [--format md|tex] [--skeleton] [--json]
  martial guide
  martial describe [--json]
  martial mcp
  martial --version

AI agents: start with `martial guide`.";

fn fail(msg: &str) -> ExitCode {
    eprintln!("martial: {msg}");
    ExitCode::from(2)
}

struct Args {
    file: Option<String>,
    req: Request,
    json: bool,
    github: bool,
    skeleton: bool,
}

fn parse(args: &[String], command: &str) -> Result<Args, String> {
    let mut a = Args { file: None, req: Request::default(), json: false, github: false, skeleton: false };
    let mut i = 0;
    let value = |i: &mut usize, flag: &str| -> Result<String, String> {
        *i += 1;
        args.get(*i).cloned().ok_or(format!("{flag} needs a value"))
    };
    while i < args.len() {
        let arg = args[i].as_str();
        match arg {
            "--json" => a.json = true,
            "--skeleton" if command == "claims" => a.skeleton = true,
            "--no-sidecar" if command == "check" => a.req.no_sidecar = true,
            "--profile" => {
                let v = value(&mut i, arg)?;
                a.req.profile = Some(Profile::parse(&v).ok_or(format!("unknown profile {v:?}; manuscript, software-doc or general"))?);
            }
            "--format" => {
                let v = value(&mut i, arg)?;
                a.req.format = Some(Format::parse(&v).ok_or(format!("unknown format {v:?}; md or tex"))?);
            }
            "--sidecar" if command == "check" => a.req.sidecar = Some(PathBuf::from(value(&mut i, arg)?)),
            "--sources" if command == "check" => a.req.sources = Some(PathBuf::from(value(&mut i, arg)?)),
            "--repo" if command == "check" => a.req.repo = Some(PathBuf::from(value(&mut i, arg)?)),
            "--against" if command == "check" => a.req.against = Some(PathBuf::from(value(&mut i, arg)?)),
            "--annotate" if command == "check" => match value(&mut i, arg)?.as_str() {
                "github" => a.github = true,
                v => return Err(format!("unknown annotation format {v:?}; github")),
            },
            _ if arg.starts_with("--") => return Err(format!("unknown option {arg} for {command}")),
            _ if a.file.is_none() => a.file = Some(arg.to_string()),
            _ => return Err(format!("unexpected argument {arg:?}")),
        }
        i += 1;
    }
    if a.json && a.github {
        return Err("give either --json or --annotate github, not both".into());
    }
    match a.file.as_deref() {
        None => return Err(format!("{command} needs a FILE (or - for stdin)")),
        Some("-") => {
            let mut t = String::new();
            std::io::stdin().read_to_string(&mut t).map_err(|e| format!("cannot read stdin: {e}"))?;
            a.req.text = Some(t);
            a.req.name = Some("<stdin>".into());
        }
        Some(f) => a.req.path = Some(PathBuf::from(f)),
    }
    Ok(a)
}

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let Some(cmd) = args.first().map(String::as_str) else {
        println!("{USAGE}");
        return ExitCode::from(2);
    };
    let rest = &args[1..];
    match cmd {
        "--version" | "-V" | "version" => {
            println!("martial {}", martial::VERSION);
            ExitCode::SUCCESS
        }
        "--help" | "-h" | "help" => {
            println!("{USAGE}");
            ExitCode::SUCCESS
        }
        "guide" => {
            print!("{}", martial::describe::GUIDE);
            ExitCode::SUCCESS
        }
        "describe" => {
            if rest.iter().any(|a| a == "--json") {
                println!("{}", serde_json::to_string_pretty(&martial::describe::json()).unwrap());
            } else {
                print!("{}", martial::describe::text());
            }
            ExitCode::SUCCESS
        }
        "mcp" => match martial::mcp::serve() {
            Ok(()) => ExitCode::SUCCESS,
            Err(e) => fail(&e.to_string()),
        },
        "check" => {
            let a = match parse(rest, "check") {
                Ok(a) => a,
                Err(e) => return fail(&e),
            };
            match martial::check(&a.req) {
                Ok(r) => {
                    if a.json {
                        println!("{}", serde_json::to_string_pretty(&r).unwrap());
                    } else if a.github {
                        print!("{}", r.github());
                    } else {
                        print!("{}", r.text());
                    }
                    ExitCode::from(r.verdict.exit_code() as u8)
                }
                Err(e) => fail(&e),
            }
        }
        "claims" => {
            let a = match parse(rest, "claims") {
                Ok(a) => a,
                Err(e) => return fail(&e),
            };
            match martial::claims(&a.req, a.skeleton) {
                Ok(c) => {
                    if a.json || a.skeleton {
                        println!("{}", serde_json::to_string_pretty(&c).unwrap());
                    } else {
                        println!("martial {} · {} · {} · {} claim(s)", c.martial, c.file, c.profile.name(), c.claims.len());
                        for row in &c.claims {
                            let via = if row.cites.is_empty() { String::new() } else { format!(" [{}]", row.cites.join(", ")) };
                            println!("{} {}{} (strength {})\n  > {}", row.at, row.support, via, row.strength, row.sentence);
                        }
                    }
                    ExitCode::SUCCESS
                }
                Err(e) => fail(&e),
            }
        }
        _ => fail(&format!("unknown command {cmd:?}\n{USAGE}")),
    }
}
