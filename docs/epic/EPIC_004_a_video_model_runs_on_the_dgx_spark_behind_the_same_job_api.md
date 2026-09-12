# EPIC_004 — A video model runs on the DGX Spark behind the same job API

**Status:** Not started (after EPIC_003)

## Goal

The UI's configured generation endpoint points at the Spark, and a real video comes back.

## Open question #1 — which model (must be answered before any weights are fetched)

Read from the official LICENSE on 2026-09-12: **MiniMax-H3**'s Community License excludes the EU, UK, South Korea and the **United States** and forbids use, reproduction, modification, distribution or display of the works and their outputs outside the applicable territory ([README.md → Running the Model](../../README.md#running-the-model)). If the Spark sits in an excluded territory, H3's open weights are not licensed for it. The owner chooses between:

- (a) MiniMax's hosted video API behind the same job interface — keeps the MiniMax model, loses the on-Spark half;
- (b) a different open-weight video model on the Spark whose license permits it.

The decision, and the license terms it rests on (read from the model's own repository that session), are recorded here before the first story is drafted ([CLAUDE.md → §4a](../../CLAUDE.md#4a-two-machines-the-mac-and-the-spark)).

## Stories

Drafted after the model decision. Expected shape: serving stack install script; weight fetch; memory-budget derivation and measurement; the job-API adapter in front of the serving stack; systemd unit; the UI's env pointed at the Spark with a manual verification note.
