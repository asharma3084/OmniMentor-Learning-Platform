# 00. Overview

[![Docs Index](https://img.shields.io/badge/Docs%20Index-0ea5e9?style=for-the-badge&labelColor=082f49)](README.md) [![Overview](https://img.shields.io/badge/Overview-14b8a6?style=for-the-badge&labelColor=042f2e)](00-overview.md) [![Requirements](https://img.shields.io/badge/Requirements-6366f1?style=for-the-badge&labelColor=1e1b4b)](01-requirements.md) [![Architecture](https://img.shields.io/badge/Architecture-a855f7?style=for-the-badge&labelColor=3b0764)](architecture.md) [![Quality Gates](https://img.shields.io/badge/Quality%20Gates-22c55e?style=for-the-badge&labelColor=052e16)](07-verification-and-quality-gates.md) [![Security](https://img.shields.io/badge/Security-ef4444?style=for-the-badge&labelColor=450a0a)](10-security-and-compliance.md)

![Proposal Aligned](https://img.shields.io/badge/Proposal-Aligned-f59e0b?style=flat-square) ![CS6460 Gate Discipline](https://img.shields.io/badge/CS6460-Gate%20Discipline-2563eb?style=flat-square) ![Synthetic Only](https://img.shields.io/badge/Data-Synthetic%20Only-16a34a?style=flat-square)

## Purpose

OmniMentor is a learning solution for evidence-first engineering decision making.

Operating model in current scope:
- Local single-user web solution.
- macOS-first runtime target.
- Open source only (no paid version).
- No telemetry or external data collection.

## Problem

Teams often make change decisions using incomplete evidence, which increases incident risk and rework.

## Solution Direction

OmniMentor provides scenario-based practice with explicit evidence gating, transparent rubric scoring, and reproducible evaluation outputs.

## Scope Baseline

- Web interface for learner workflow.
- API for scenario retrieval, submissions, scoring, and evaluation.
- Core gating and scoring engine.
- Synthetic datasets and benchmark-driven evaluation.

## Out Of Scope (Current)

- Production identity and access management.
- Multi-user tenancy controls.
- Real customer data ingestion.
