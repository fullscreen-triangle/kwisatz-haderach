# toyd

toyd seeds a local database from CSV files.

## Usage

Run `toyd --dry-run` to see what would be written, then `toyd --force` to write it.
The entry point is `run_all()` in `src/main.rs`; configuration is read by `load_cfg()`.

```bash
npm run build
npm run bundle
cargo run --example demo
cargo run --example tour
python scripts/seed.py
make lint
make deploy
```

## Performance

The loader is 4x faster than the previous version.
The store guarantees atomic writes, as [the tests](tests/atomic.md) check.
This makes the tool safe to interrupt.

## Notes

It may possibly work on Windows.
The WAL lives in `data/wal/`, and lookups go through an LRU cache.
See [usage](#usage), [setup](#setup) and [the changelog](CHANGELOG.md).
