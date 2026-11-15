# VIGIL-X — Base Station Safety Dashboard

> **Infrastructure-independent real-time worker safety monitoring interface for hazardous environments** — built with LoRa telemetry ingestion, deterministic man-down & gas-hazard state machines, and live/demo simulation modes.

**Validation:** Patent Filed (Application Pending) · **3rd Prize**, ECE Department Ideathon (Cambridge Institute of Technology, Bengaluru)

---

## Overview

Industrial, underground, and remote field workers often operate in dead zones where cellular and Wi-Fi networks fail. **VIGIL-X** pairs wearable STM32/Arduino + SX1278 LoRa (433 MHz) sensor nodes with this base-station command dashboard so safety supervisors can monitor worker vitals, motion state, and toxic gas exposure in real time—without relying on cloud connectivity.

<!-- Add a screenshot or 10-second demo GIF here:
[docs/dashboard.png]
-->

---

## Key Features

* **Multi-Format LoRa Packet Parser (`src/utils/packetParser.ts`):** Ingests and sanitizes telemetry across JSON, CSV (`VX,WORKER_01,...`), and pipe-delimited Key-Value (`W:WORKER_01|E:MAN_DOWN|...`) MCU payloads while rejecting `NaN`, `Infinity`, and malformed frames.
* **MQ-2 Gas Hazard Engine (`src/logic/safetyEngine.ts`):** Validates 10-bit ADC readings (`0–1023`), flags out-of-range sensor faults, and applies a `15`-unit hysteresis deadband around the `500` ADC threshold to prevent alarm flapping.
* **Man-Down & Immobility Escalation:** Tracks IMU motion state (`MOVING` / `IMMOBILE`) with a configurable immobility timeout (`10s` default) and multi-step emergency alert escalation.
* **Rolling Telemetry & Event Timeline:** Retains a 60-sample rolling telemetry window for sparklines and logs every state transition in an auditable event timeline with audio alerts.
* **Interactive Simulator & Live Modes:** Built-in `InteractiveSimulator` lets reviewers test man-down, gas hazard, and link-loss scenarios directly in the browser without physical LoRa hardware.
* **Chemical Context & Persistence:** Integrates PubChem lookup (`src/services/pubchemService.ts`), Gemini AI assistance (`@google/genai`), and Firebase/Firestore rules for incident logging.

---

## System Architecture

```text
[Wearable Node: MCU + SX1278 LoRa (433 MHz) + MQ-2 Gas + MPU6050 IMU + GPS]
                                    │
                            LoRa RF Telemetry
                                    ▼
[Base Station Receiver] ──► packetParser.ts (JSON / CSV / KV validation)
                                    │
                                    ▼
                        safetyEngine.ts (ADC bounds, hysteresis, Man-Down FSM)
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
        React + Tailwind Dashboard        Firebase / Event Timeline
        (WorkerCards, Alerts, Simulator)  (Audit Logs & Incident State)
