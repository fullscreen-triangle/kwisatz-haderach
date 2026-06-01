"""
Health tracker — dispatches to garmin_fetch or feed_fetch.

Usage (from repo root):
  python -m tools.health_tracker garmin --today
  python -m tools.health_tracker feed
"""
import sys

sub = sys.argv[1] if len(sys.argv) > 1 else ''
sys.argv = [sys.argv[0]] + sys.argv[2:]

if sub == 'garmin':
    from tools.health_tracker.garmin_fetch import main
    main()
elif sub == 'feed':
    from tools.health_tracker.feed_fetch import main
    main()
else:
    print("Usage: python -m tools.health_tracker [garmin|feed] [options]")
    sys.exit(1)
