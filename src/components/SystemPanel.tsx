import React, { useState } from 'react';
import { useSafetySystem } from '../context/SafetySystemContext';
import {
  Usb,
  Radio,
  Cpu,
  Terminal,
  Send,
  Code2,
  Check,
  Copy,
  AlertCircle,
  Activity,
  Layers,
  ArrowRight,
} from 'lucide-react';

export const SystemPanel: React.FC = () => {
  const {
    baseStation,
    connectSerial,
    disconnectSerial,
    serialLogs,
    injectRawPacket,
    toggleBaseStationPower,
    toggleLoraLink,
  } = useSafetySystem();

  const [inputLine, setInputLine] = useState<string>('');
  const [injectResult, setInjectResult] = useState<{ success: boolean; message: string } | null>(null);
  const [activeCodeTab, setActiveCodeTab] = useState<'worker' | 'base'>('worker');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const handleInject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputLine.trim()) return;
    const res = injectRawPacket(inputLine.trim());
    setInjectResult(res);
    setInputLine('');
    setTimeout(() => setInjectResult(null), 4000);
  };

  const loadSample = (sample: string) => {
    setInputLine(sample);
  };

  const copyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const workerArduinoCode = `// ============================================================
// VIGIL-X: WORKER NODE EMBEDDED FIRMWARE (PRODUCTION PROTOTYPE)
// Hardware: Arduino Uno + SX1278 LoRa (SPI) + MPU6050 (I2C) + MQ-2 (ADC)
// ============================================================
#include <SPI.h>
#include <LoRa.h>
#include <Wire.h>

#define GAS_PIN A0
#define GAS_THRESHOLD 500
#define GAS_HYSTERESIS 15
#define IMMOBILITY_TIMEOUT_MS 10000UL
#define MPU_ADDR 0x68

// SX1278 SPI Pins on Arduino Uno
#define LORA_SS 10
#define LORA_RST 9
#define LORA_DIO0 2

const char* WORKER_ID = "WORKER_01";

// State Machine Variables
enum SystemState { STATE_NORMAL, STATE_POSSIBLE_FALL, STATE_MAN_DOWN };
SystemState currentState = STATE_NORMAL;
bool gasHazardActive = false;

unsigned long fallDetectedMillis = 0;
unsigned long sustainedMotionStart = 0;
unsigned long lastHeartbeatMillis = 0;
unsigned long lastImuSampleMillis = 0;

// Acceleration readings (in g)
float ax = 0, ay = 0, az = 1.0;
float accelMag = 1.0;

void initMPU6050() {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B); // PWR_MGMT_1 register
  Wire.write(0x00); // Wake up MPU6050
  Wire.endTransmission(true);
}

void readMPU6050() {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B); // Starting at ACCEL_XOUT_H
  Wire.endTransmission(false);
  Wire.requestFrom((uint8_t)MPU_ADDR, (uint8_t)6, (uint8_t)true);

  if (Wire.available() >= 6) {
    int16_t rawX = (Wire.read() << 8) | Wire.read();
    int16_t rawY = (Wire.read() << 8) | Wire.read();
    int16_t rawZ = (Wire.read() << 8) | Wire.read();

    // Scale factor for +/- 2g is 16384 LSB/g
    ax = rawX / 16384.0;
    ay = rawY / 16384.0;
    az = rawZ / 16384.0;
    accelMag = sqrt(ax * ax + ay * ay + az * az);
  }
}

void transmitPacket(const char* eventType, int gasVal, const char* imuState) {
  String packet = "{\\"workerId\\":\\"" + String(WORKER_ID) + 
                  "\\",\\"event\\":\\"" + String(eventType) + 
                  "\\",\\"gas\\":" + String(gasVal) + 
                  ",\\"imuState\\":\\"" + String(imuState) + 
                  "\\",\\"ax\\":" + String(ax, 2) + 
                  ",\\"ay\\":" + String(ay, 2) + 
                  ",\\"az\\":" + String(az, 2) + "}";

  LoRa.beginPacket();
  LoRa.print(packet);
  LoRa.endPacket();

  Serial.println("TX -> " + packet);
}

void setup() {
  Serial.begin(115200);
  Wire.begin();
  initMPU6050();

  // Initialize LoRa at 433 MHz
  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);
  if (!LoRa.begin(433E6)) {
    Serial.println("LoRa initialization failed!");
    while (1);
  }
  LoRa.setSpreadingFactor(7);
  LoRa.setSignalBandwidth(125E3);
  LoRa.setCodingRate4(5);
  Serial.println("[VIGIL-X WORKER NODE READY]");
}

void loop() {
  unsigned long now = millis();

  // 1. High-frequency 50Hz non-blocking IMU sampling
  if (now - lastImuSampleMillis >= 20) {
    lastImuSampleMillis = now;
    readMPU6050();

    bool isMoving = (abs(accelMag - 1.0) > 0.28); // Dynamic movement deviation

    // --- State Machine Transitions ---
    if (currentState == STATE_NORMAL) {
      // High-G impact detection (> 2.8g) indicating fall
      if (accelMag >= 2.8) {
        currentState = STATE_POSSIBLE_FALL;
        fallDetectedMillis = now;
        Serial.println("[IMU] Possible fall impact detected!");
        transmitPacket("POSSIBLE_FALL", analogRead(GAS_PIN), "POSSIBLE_FALL");
      }
    } 
    else if (currentState == STATE_POSSIBLE_FALL) {
      if (isMoving) {
        // Worker got back up and moved -> cancel fall check!
        currentState = STATE_NORMAL;
        Serial.println("[IMU] Motion resumed - Self-recovery confirmed.");
        transmitPacket("NORMAL", analogRead(GAS_PIN), "MOVING");
      } else if (now - fallDetectedMillis >= IMMOBILITY_TIMEOUT_MS) {
        // Sustained immobility -> MAN DOWN emergency confirmed!
        currentState = STATE_MAN_DOWN;
        Serial.println("[IMU] Immobility timeout reached -> MAN DOWN!");
        transmitPacket("MAN_DOWN", analogRead(GAS_PIN), "IMMOBILE");
      }
    } 
    else if (currentState == STATE_MAN_DOWN) {
      // Autonomous recovery check if worker regains consciousness
      if (isMoving) {
        if (sustainedMotionStart == 0) sustainedMotionStart = now;
        if (now - sustainedMotionStart >= 2500) { // Sustained walking for 2.5s
          currentState = STATE_NORMAL;
          sustainedMotionStart = 0;
          Serial.println("[IMU] Worker resumed walking -> Recovery broadcast.");
          transmitPacket("NORMAL", analogRead(GAS_PIN), "MOVING");
        }
      } else {
        sustainedMotionStart = 0;
      }
    }
  }

  // 2. Gas threshold evaluation with hysteresis
  int gasVal = analogRead(GAS_PIN);
  if (!gasHazardActive && gasVal >= GAS_THRESHOLD) {
    gasHazardActive = true;
    transmitPacket("GAS_HAZARD", gasVal, (currentState == STATE_MAN_DOWN ? "IMMOBILE" : "MOVING"));
  } else if (gasHazardActive && gasVal < (GAS_THRESHOLD - GAS_HYSTERESIS)) {
    gasHazardActive = false;
  }

  // 3. Periodic 1Hz Heartbeat transmission
  if (now - lastHeartbeatMillis >= 1000) {
    lastHeartbeatMillis = now;

    const char* eventType = "NORMAL";
    if (currentState == STATE_MAN_DOWN && gasHazardActive) {
      eventType = "COMPOUND_HAZARD"; // Dual critical hazard
    } else if (currentState == STATE_MAN_DOWN) {
      eventType = "MAN_DOWN";
    } else if (currentState == STATE_POSSIBLE_FALL) {
      eventType = "POSSIBLE_FALL";
    } else if (gasHazardActive) {
      eventType = "GAS_HAZARD";
    }

    const char* imuState = (currentState == STATE_NORMAL) ? "MOVING" : "IMMOBILE";
    transmitPacket(eventType, gasVal, imuState);
  }
}`;

  const baseStationArduinoCode = `// ============================================================
// VIGIL-X: BASE STATION RECEIVER FIRMWARE
// Hardware: Arduino Uno + SX1278 LoRa (SPI) -> USB Serial Bridge
// ============================================================
#include <SPI.h>
#include <LoRa.h>

#define LORA_SS 10
#define LORA_RST 9
#define LORA_DIO0 2

void setup() {
  Serial.begin(115200); // Match Web Serial baud rate
  while (!Serial);

  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);
  if (!LoRa.begin(433E6)) {
    Serial.println("{\\"error\\":\\"LoRa receiver init failed\\"}");
    while (1);
  }
  LoRa.setSpreadingFactor(7);
  LoRa.setSignalBandwidth(125E3);
  Serial.println("[VIGIL-X BASE STATION READY]");
}

void loop() {
  int packetSize = LoRa.parsePacket();
  if (packetSize) {
    String payload = "";
    while (LoRa.available()) {
      payload += (char)LoRa.read();
    }
    
    int rssi = LoRa.packetRssi();
    float snr = LoRa.packetSnr();

    // If payload is JSON without RSSI, append RF metadata
    if (payload.endsWith("}")) {
      payload.remove(payload.length() - 1);
      payload += ",\\"rssi\\":" + String(rssi) + ",\\"snr\\":" + String(snr) + "}";
    }

    // Print to USB Serial for Vigil-X Dashboard
    Serial.println(payload);
  }
}`;

  return (
    <div className="space-y-6 select-none font-mono">
      {/* Hardware Status & Architecture Diagram */}
      <div className="bg-[#0e1626] border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">
              BASE STATION HARDWARE & LORA LINK TOPOLOGY
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            Hackathon MVP Architecture
          </span>
        </div>

        {/* Visual Pipeline Flow */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center text-xs">
          {/* Node 1: Worker Node */}
          <div className="p-3 bg-[#0a101d] rounded-lg border border-slate-800 flex flex-col justify-between h-32">
            <span className="text-slate-500 text-[10px]">WORKER NODE</span>
            <div>
              <div className="font-bold text-slate-200">Arduino Uno</div>
              <div className="text-[11px] text-slate-400">+ MPU6050 (IMU)</div>
              <div className="text-[11px] text-slate-400">+ MQ-2 (Gas Sensor)</div>
            </div>
            <div className="text-[10px] text-emerald-400">Autonomous Decision</div>
          </div>

          <div className="hidden md:flex justify-center text-slate-600">
            <ArrowRight className="w-5 h-5" />
          </div>

          {/* Node 2: Wireless LoRa Link */}
          <div className="p-3 bg-[#0a101d] rounded-lg border border-cyan-900/50 flex flex-col justify-between h-32">
            <span className="text-slate-500 text-[10px]">WIRELESS LINK</span>
            <div>
              <div className="font-bold text-cyan-400 flex items-center gap-1">
                <Radio className="w-3.5 h-3.5" />
                SX1278 LoRa
              </div>
              <div className="text-[11px] text-slate-400">433.0 MHz / SF7</div>
              <div className="text-[11px] text-slate-400">No Cellular / No Cloud</div>
            </div>
            <div className="text-[10px] text-cyan-300">Point-to-Multipoint</div>
          </div>

          <div className="hidden md:flex justify-center text-slate-600">
            <ArrowRight className="w-5 h-5" />
          </div>

          {/* Node 3: Base Station Dashboard */}
          <div className="p-3 bg-[#0a101d] rounded-lg border border-amber-900/50 flex flex-col justify-between h-32">
            <span className="text-slate-500 text-[10px]">BASE STATION</span>
            <div>
              <div className="font-bold text-amber-400 flex items-center gap-1">
                <Usb className="w-3.5 h-3.5" />
                Arduino + Dashboard
              </div>
              <div className="text-[11px] text-slate-400">USB Serial @ 115200</div>
              <div className="text-[11px] text-slate-400">Real-time Visualizer</div>
            </div>
            <div className="text-[10px] text-amber-300">Operator Control Room</div>
          </div>
        </div>

        {/* Base Station Hardware Toggles */}
        <div className="mt-5 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-900/60 rounded border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-slate-500 text-[10px] block">BASE STATION HARDWARE</span>
              <span className={`font-bold ${baseStation.isOnline ? 'text-emerald-400' : 'text-rose-400'}`}>
                {baseStation.isOnline ? 'ONLINE (POWERED)' : 'POWER OFF'}
              </span>
            </div>
            <button
              onClick={toggleBaseStationPower}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs"
            >
              Toggle
            </button>
          </div>

          <div className="p-3 bg-slate-900/60 rounded border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-slate-500 text-[10px] block">LORA CARRIER</span>
              <span className={`font-bold ${baseStation.loraLinkConnected ? 'text-cyan-400' : 'text-amber-400'}`}>
                {baseStation.loraLinkConnected ? 'CARRIER LOCK (433MHz)' : 'CARRIER STANDBY'}
              </span>
            </div>
            <button
              onClick={toggleLoraLink}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs"
            >
              Toggle
            </button>
          </div>

          <div className="p-3 bg-slate-900/60 rounded border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-slate-500 text-[10px] block">WEB SERIAL PORT</span>
              <span className={`font-bold ${baseStation.serialConnected ? 'text-emerald-400' : 'text-slate-400'}`}>
                {baseStation.serialConnected ? 'PORT CONNECTED' : 'DISCONNECTED'}
              </span>
            </div>
            {baseStation.serialConnected ? (
              <button
                onClick={disconnectSerial}
                className="px-2.5 py-1 rounded bg-rose-950 text-rose-300 border border-rose-800 text-xs"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={connectSerial}
                className="px-2.5 py-1 rounded bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 text-xs"
              >
                Connect USB
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Raw Packet Injector & Serial Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Raw Packet Injector */}
        <div className="bg-[#0e1626] border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">
                RAW PACKET INJECTOR / TEST INPUT
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Send raw telemetry lines into the parser to test how the base station decodes live serial data from the Arduino.
            </p>

            {/* Quick Sample Packet Buttons */}
            <div className="space-y-2 mb-4">
              <span className="text-[11px] text-slate-500 block">QUICK TEST PRESETS:</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => loadSample('{"workerId":"WORKER_01","event":"MAN_DOWN","gas":342,"imuState":"IMMOBILE","rssi":-87,"snr":7.5}')}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 text-[11px] border border-slate-700"
                >
                  JSON (Man-Down)
                </button>
                <button
                  type="button"
                  onClick={() => loadSample('VX,WORKER_02,GAS_HAZARD,750,MOVING,-78,9.2')}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] border border-slate-700"
                >
                  CSV (Gas Hazard)
                </button>
                <button
                  type="button"
                  onClick={() => loadSample('W:WORKER_03|E:POSSIBLE_FALL|G:310|IMU:POSSIBLE_FALL|RSSI:-82')}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] border border-slate-700"
                >
                  Key-Value (Fall)
                </button>
                <button
                  type="button"
                  onClick={() => loadSample('{"workerId":"WORKER_01","event":"NORMAL","gas":295,"imuState":"MOVING"}')}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[11px] border border-slate-700"
                >
                  JSON (Normal)
                </button>
              </div>
            </div>

            {/* Input Form */}
            <form onSubmit={handleInject} className="space-y-3">
              <div>
                <textarea
                  rows={3}
                  value={inputLine}
                  onChange={(e) => setInputLine(e.target.value)}
                  placeholder='Paste packet line e.g. {"workerId":"WORKER_01","event":"MAN_DOWN","gas":740} or VX,WORKER_01,...'
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100 placeholder-slate-600 focus:outline-hidden focus:border-amber-400 font-mono"
                />
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  PARSE & INJECT PACKET
                </button>

                {injectResult && (
                  <span
                    className={`text-xs ${
                      injectResult.success ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {injectResult.message}
                  </span>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Right: Live Serial Console Log */}
        <div className="bg-[#0e1626] border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  SERIAL / BRIDGE CONSOLE LOG
                </h3>
              </div>
              <span className="text-[10px] text-slate-500">
                115200 baud stream
              </span>
            </div>

            <div className="h-64 overflow-y-auto bg-slate-950 p-3 rounded border border-slate-900 text-[11px] font-mono space-y-1 text-slate-300 select-text">
              {serialLogs.map((log, i) => (
                <div
                  key={i}
                  className={`leading-tight ${
                    log.includes('CRITICAL') || log.includes('MAN_DOWN') || log.includes('ERR')
                      ? 'text-rose-400'
                      : log.includes('GAS_HAZARD') || log.includes('WARNING')
                      ? 'text-amber-400'
                      : log.includes('[PARSED]')
                      ? 'text-emerald-400'
                      : log.includes('[SERIAL RX]')
                      ? 'text-cyan-300'
                      : 'text-slate-400'
                  }`}
                >
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Arduino Firmware Reference */}
      <div className="bg-[#0e1626] border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold text-white">
                ARDUINO FIRMWARE REFERENCE CODE (HACKATHON HARDWARE)
              </h3>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Ready-to-upload Arduino Uno sketches with matching packet serialization for your prototype
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-[#121927] p-1 rounded border border-slate-800 text-xs">
              <button
                onClick={() => setActiveCodeTab('worker')}
                className={`px-3 py-1 rounded transition-colors ${
                  activeCodeTab === 'worker'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Worker Node Sketch
              </button>
              <button
                onClick={() => setActiveCodeTab('base')}
                className={`px-3 py-1 rounded transition-colors ${
                  activeCodeTab === 'base'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Base Station Sketch
              </button>
            </div>

            <button
              onClick={() => copyCode(activeCodeTab === 'worker' ? workerArduinoCode : baseStationArduinoCode)}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs flex items-center gap-1"
              title="Copy sketch to clipboard"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <pre className="p-4 bg-slate-950 rounded-lg border border-slate-900 text-xs text-slate-300 overflow-x-auto max-h-96 select-text font-mono leading-relaxed">
          {activeCodeTab === 'worker' ? workerArduinoCode : baseStationArduinoCode}
        </pre>
      </div>
    </div>
  );
};
