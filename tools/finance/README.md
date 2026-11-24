# Finance

The desk's personal finance tool. It answers five questions:

1. Where do I stand: what am I owed, what do I own, what do I owe?
2. Is anything about to be lost, such as a claim that runs out?
3. When will I be free of debt, and what would bring that date forward?
4. What does buying this now really cost me?
5. Where are my parcels, and until when can I send them back?

It reads, calculates and reminds. It never moves money, never pays anything and never
buys anything. It needs no budget: there are no categories or monthly limits to keep.

## Where your data lives

All figures are kept in `~/.desk/finance/`, or in the folder named by the environment
variable `FINANCE_HOME`. That folder is outside every repository, so nothing you enter
can be committed or published. It holds three files:

| File | What it holds |
|---|---|
| position.json | income, fixed costs, debts, money owed to you, investments, settings |
| transactions.json | rows imported from bank exports |
| deliveries.json | parcels by tracking number |

The files are plain JSON and every write is atomic, so a crash never leaves half a
file. To back up or move your data, copy the folder.

## The desk page

Open **Money** on the desk front page, or go to `/desk/finance`. The page has six parts.

- **Totals.** What you are owed, what you have invested, what you owe, and the net of
  the three. Below it, your monthly income, fixed costs, minimum debt payments and what
  is left after them.
- **Alerts**, most urgent first:
  - *urgent*: a claim runs out within 14 days and has not been made in writing;
  - *warning*: the same within 60 days;
  - *info*: anything else to know, such as an interest rate that is still an assumption.
- **Owed to you.** Each amount with its due date, how long it is overdue, the deadline
  for claiming it and the last thing you did about it. Three buttons record what you
  did:
  - *Claimed in writing*: you sent a written claim. This silences the deadline warning.
  - *Reminded*: you sent a reminder; the warning stays.
  - *Payment received*: asks for the amount; a part payment leaves the rest open.
- **Debts and plan.** Each debt with its balance, interest rate and minimum payment.
  Enter how much goes to debt each month and, optionally, a one-off payment in a given
  month, then press *Plan*. You see the month you become debt-free, the interest you
  will pay in total and when each debt ends.
- **Can I afford it?** Enter a price. You see how many days later you become debt-free
  if you buy it now, and how much extra interest it costs.
- **Parcels and bank exports.** *Scan mail* reads the desk's mailbox for order and
  shipping messages. *Choose file* imports a Sparkasse or Revolut export.

## First setup

Run these from the repository root. Every command prints JSON. Amounts accept
`1234.56` or `1.234,56`. Interest rates are fractions: `0.19` means 19 % a year.

```
python -m tools.finance income --net 2500 --fixed "Rent=600"
python -m tools.finance debt credit-card --name "Credit card" --balance 3000 --rate 0.19 --min-percent 3 --min-floor 25
python -m tools.finance debt car-loan --name "Car loan" --balance 6000 --rate 0.06 --min-fixed 200
python -m tools.finance owed deposit --debtor "Former landlord" --what "Deposit" --amount 1200 --due 2026-12-31
python -m tools.finance invest broker --name "Broker account" --value 1000 --source "statement"
python -m tools.finance setting monthly_to_debt 800
python -m tools.finance show
```

What each line records:

- **`income`**: monthly take-home pay, and each fixed cost as `NAME=AMOUNT`. Repeat
  `--fixed` for more than one.
- **`debt ID`**: a debt. Its minimum payment is either fixed (`--min-fixed`) or a
  percentage of the balance with a floor (`--min-percent`, `--min-floor`), the usual
  form for credit cards. Run the same command again to change a balance or a rate.
- **`owed ID`**: money someone owes you. `--due` is when it was due; `--deadline` is
  the last day you can still claim it.
- **`invest ID`**: an investment and its current value.
- **`setting monthly_to_debt`**: how much goes to debt each month in total, minimum
  payments included. It is your choice: the plan works with whatever you set. Until you
  set it, the plan assumes minimum payments only.

### Assumed figures

If you do not know a rate yet, enter your best estimate and mark it:

```
python -m tools.finance debt credit-card --rate 0.23 --basis assumed
```

An assumed rate shows as an *info* alert until you replace it from the contract with
`--rate ... --basis contract`. For deadlines, choose the stricter date when you are
unsure: an early warning costs nothing, while a missed deadline can cost the whole
claim.

## Everyday use

| When this happens | Do this |
|---|---|
| You send a written claim for money owed | *Claimed in writing* on the page, or `python -m tools.finance log ID claimed-in-writing --note "email to HR"` |
| You send a reminder | *Reminded*, or `log ID reminded` |
| Someone promises to pay | `log ID promised --note "by 15 Jan"` |
| Money owed arrives | *Payment received*, or `received ID AMOUNT` |
| A debt balance changes (new statement) | `debt ID --balance AMOUNT` |
| A contract shows the real rate | `debt ID --rate 0.0X --basis contract` |
| You are thinking of buying something | *Can I afford it?*, or `afford PRICE` |
| Money arrives that could go to debt | try it as a one-off payment in *Plan*, or `plan --lump 2027-01=2000` |
| End of month | download the bank exports and import them |
| You are waiting for a parcel | *Scan mail* |

Nothing has to be done daily. When the alerts list is empty, there is nothing to do.

## The debt plan

The plan pays every debt its minimum. Everything else of your monthly amount goes to
the debt with the **highest interest rate**, then the next. This order (the
"avalanche") pays the least interest in total. Interest is charged monthly from the
effective annual rate.

- `plan` uses your `monthly_to_debt` setting.
- `plan --monthly 1000` tries a different amount without saving it.
- `plan --lump 2027-01=2000` adds a one-off payment in January 2027. Repeat `--lump`
  for several.

If the payments do not even cover the interest, the plan says the debt never ends.
Percentage minimums come close to this: the payment shrinks with the balance, so paying
only the minimum on a credit card can take many years.

## Can I afford it?

`afford 300` compares two plans: one where you keep the €300 for debt, one where you
spend it now. The answer is:

- the number of days later you become debt-free;
- the extra interest the purchase costs you.

Without a `monthly_to_debt` setting it can only say whether the end date moves, so
set it first.

## Parcels

*Scan mail* reads the last 60 days of the desk's mail store and finds tracking numbers.
It knows these carriers: `DHL` and Deutsche Post, United Parcel Service (UPS), Dynamic
Parcel Distribution (DPD), Hermes, and General Logistics Systems (GLS). To avoid mistaking order or customer
numbers for tracking numbers, a number is taken only from one of three sources:

- a carrier's tracking link;
- a labelled number, such as "Sendungsnummer: …";
- a carrier's number format, close to a word such as "Sendung" or "Paket", in a
  message that names that carrier.

Each parcel shows its status:

- *ordered*
- *shipped*
- *in-transit*
- *out-for-delivery*
- *delivered*

A status only ever moves forward. Once a parcel is delivered, **return by** shows the
date 14 days later. That is the minimum EU withdrawal period for goods bought online;
many shops allow longer. Each tracking number links to the carrier's own tracking page.

From the command line, with the mail store's path:

```
python -m tools.finance deliveries --scan /path/to/state/mail/mail.db --since 2026-10-01
```

## Bank exports

Download a CSV export from online banking and import it on the page or with
`python -m tools.finance import FILE`.

- **Sparkasse:** in online banking, choose `Umsätze`, then `Export`, then
  `CSV-CAMT V2`. The older `CSV-MT940` format works too.
- **Revolut:** download a statement as CSV (Excel format). Pending and reverted rows
  are skipped, and fees are deducted from the amount.

Importing the same period twice adds nothing, so overlapping exports are safe. The page
shows money in and money out per month for the last three months.

## Command reference

| Command | Purpose |
|---|---|
| `show` | totals, monthly picture, money owed, debts, alerts |
| `plan [--monthly A] [--lump YYYY-MM=A ...]` | debt payoff plan |
| `afford PRICE [--monthly A]` | delay and extra interest of a purchase |
| `income [--net A] [--fixed NAME=A ...]` | take-home pay and fixed costs |
| `debt ID [--name] [--creditor] [--balance] [--rate] [--basis] [--min-fixed A \| --min-percent P --min-floor A]` | add or change a debt |
| `owed ID [--debtor] [--what] [--amount] [--due] [--deadline] [--status]` | add or change money owed to you |
| `log ID ACTION [--note] [--date]` | record `note`, `reminded`, `claimed-in-writing`, `promised` or `escalated` |
| `received ID AMOUNT [--date] [--note]` | money owed has arrived |
| `invest ID [--name] [--value] [--as-of] [--source]` | add or update an investment |
| `setting monthly_to_debt A` | your monthly amount for debt |
| `import FILE ...` | Sparkasse or Revolut CSV |
| `transactions [--limit N]` | imported rows, newest first, with monthly totals |
| `deliveries [--scan MAIL_DB] [--since DATE]` | parcels, optionally after reading the mail store |

Add `--home DIR` before the command to use another data folder. A refused input prints
`{"error": ...}` and exits with code 1.

## For the desk: the HTTP routes

The backend serves the same functions under `/finance`
([backend/routes/finance.py](../../backend/routes/finance.py)). The web app reaches them
through `/api/desk/finance/…`.

| Route | Purpose |
|---|---|
| `GET /finance/overview` | as `show` |
| `GET /finance/plan?monthly=&lump=YYYY-MM=A` | as `plan` |
| `GET /finance/afford?price=&monthly=` | as `afford` |
| `POST /finance/receivables/{id}/log` | body `{action, note, date}` |
| `POST /finance/receivables/{id}/payment` | body `{amount, date, note}` |
| `POST /finance/import` | body `{filename, text}` |
| `GET /finance/transactions?limit=` | as `transactions` |
| `GET /finance/deliveries` | parcels |
| `POST /finance/deliveries/scan` | body `{since}`; reads this node's mail store |

These routes answer only callers on the same machine or on the tailnet. To allow other
networks, set `FINANCE_ALLOWED_NETS` to a comma-separated list of address ranges in Classless
Inter-Domain Routing (CIDR) notation. Any other
caller receives 403.

## Limits

- Figures are only as current as what you enter or import. The tool does not connect
  to your bank.
- The importers follow the banks' documented export columns. If an export is refused,
  the error lists the columns it found.
- Parcel detection follows common German and English mail wording. A parcel it misses
  can still be tracked from the carrier's own page.
- The return date and claim deadlines are reminders, not legal advice. Check the
  shop's terms and your contract.

Tests: `python -m pytest backend/tests/test_finance.py` (FastAPI must be installed for
the route test).
