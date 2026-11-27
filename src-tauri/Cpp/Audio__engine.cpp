// src-tauri/cpp/audio_engine.cpp
#include <iostream>
#include <cmath>
#include <vector>

// Struct to hold audio settings passed from Rust
struct AudioSettings {
    float bass_boost;    // 0.0 to 1.0 (e.g., 0.5 = +50% bass)
    float eq_low;        // -12.0 to +12.0 dB
    float eq_mid;        // -12.0 to +12.0 dB
    float eq_high;       // -12.0 to +12.0 dB
};

extern "C" {
    // This function processes a buffer of audio samples (PCM floats)
    // In a real Tauri app, you would intercept the audio stream here.
    void process_audio_buffer(float* buffer, int num_samples, AudioSettings settings) {
        for (int i = 0; i < num_samples; ++i) {
            float sample = buffer[i];

            // 1. Apply Bass Boost (Simple gain on low frequencies, simulated here)
            // Note: True bass boost requires a low-pass filter.
            if (settings.bass_boost > 0.0f) {
                sample *= (1.0f + settings.bass_boost);
            }

            // 2. Apply EQ (Simulated weighted average based on frequency bands)
            // A real implementation would use FFT or IIR biquad filters.
            float eq_multiplier = 1.0f + ((settings.eq_low + settings.eq_mid + settings.eq_high) / 36.0f);
            sample *= eq_multiplier;

            // Prevent clipping (keep audio between -1.0 and 1.0)
            if (sample > 1.0f) sample = 1.0f;
            if (sample < -1.0f) sample = -1.0f;

            buffer[i] = sample;
        }
    }

    // A simple function to test if the C++ module is loaded correctly
    int get_engine_version() {
        return 100; // v1.0.0
    }
}
