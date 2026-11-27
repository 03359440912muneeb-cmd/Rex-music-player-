#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use walkdir::WalkDir;

// --- C++ FFI BRIDGE ---
// Define the C++ struct in Rust so they match exactly in memory
#[repr(C)]
pub struct AudioSettings {
    pub bass_boost: f32,
    pub eq_low: f32,
    pub eq_mid: f32,
    pub eq_high: f32,
}

// Link to the C++ functions
extern "C" {
    fn process_audio_buffer(buffer: *mut f32, num_samples: i32, settings: AudioSettings);
    fn get_engine_version() -> i32;
}

// Tauri command to get C++ engine version
#[tauri::command]
fn check_audio_engine() -> String {
    let version = unsafe { get_engine_version() };
    format!("DSP Engine v{}.{}.{}", version / 100, (version % 100) / 10, version % 10)
}

// Tauri command to process audio (simulation)
#[tauri::command]
fn apply_audio_effects(samples: Vec<f32>, bass: f32, low: f32, mid: f32, high: f32) -> Vec<f32> {
    let mut buffer = samples;
    let settings = AudioSettings {
        bass_boost: bass,
        eq_low: low,
        eq_mid: mid,
        eq_high: high,
    };

    // Call the C++ function safely
    unsafe {
        process_audio_buffer(buffer.as_mut_ptr(), buffer.len() as i32, settings);
    }

    buffer
}

// ... (Keep your existing Song struct and read_music_folder function here) ...

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            read_music_folder,
            check_audio_engine,
            apply_audio_effects
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
    }// Prevents additional console window on Windows in release, DO NOT REMOVE!

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use walkdir::WalkDir;

// This struct represents a single song.
// It must match the fields expected by the React frontend.
#[derive(Serialize, Deserialize, Clone, Debug)]
struct Song {
    title: String,
    artist: String,
    path: String,
    duration: String, // Formatted as "MM:SS"
    cover: Option<String>,
}

// Tauri command to read a folder and return a list of songs.
#[tauri::command]
fn read_music_folder(folder_path: String) -> Result<Vec<Song>, String> {
    let mut songs = Vec::new();
    
    // Supported audio extensions
    let valid_extensions = ["mp3", "wav", "flac", "ogg", "m4a"];

    // Walk through the directory recursively
    for entry in WalkDir::new(&folder_path)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        
        // Check if it's a file and has a valid extension
        if path.is_file() {
            if let Some(ext) = path.extension() {
                let ext_str = ext.to_string_lossy().to_lowercase();
                
                if valid_extensions.contains(&ext_str.as_str()) {
                    // Extract filename without extension for the title
                    let file_name = path.file_stem()
                        .unwrap_or_default()
                        .to_string_lossy()
                        .to_string();

                    // Simple heuristic to split "Artist - Title" if the filename contains a hyphen
                    let (artist, title) = if file_name.contains(" - ") {
                        let parts: Vec<&str> = file_name.splitn(2, " - ").collect();
                        (parts[0].trim().to_string(), parts[1].trim().to_string())
                    } else {
                        ("Unknown Artist".to_string(), file_name)
                    };

                    // For now, we leave duration as a placeholder. 
                    // Getting exact duration requires an audio library (like rodio or symphonia).
                    // We will update this in the frontend when the audio loads.
                    let duration = "00:00".to_string();

                    // Look for a cover image in the same directory (e.g., cover.jpg, folder.jpg)
                    let mut cover = None;
                    let dir = path.parent().unwrap_or(Path::new(""));
                    for cover_name in ["cover.jpg", "folder.jpg", "cover.png", "album.jpg"] {
                        let cover_path = dir.join(cover_name);
                        if cover_path.exists() {
                            cover = Some(cover_path.to_string_lossy().to_string());
                            break;
                        }
                    }

                    songs.push(Song {
                        title,
                        artist,
                        path: path.to_string_lossy().to_string(),
                        duration,
                        cover,
                    });
                }
            }
        }
    }

    // Sort songs alphabetically by title
    songs.sort_by(|a, b| a.title.cmp(&b.title));

    Ok(songs)
}

// Tauri command to get the duration of a specific audio file
// (Optional: If you want to calculate exact duration on the backend, though frontend usually handles this)
#[tauri::command]
fn get_audio_duration(path: String) -> Result<String, String> {
    // In a real app, you'd use a library like `symphonia` or `lofty` here.
    // For this lightweight version, we rely on the frontend HTML5 Audio API to get duration.
    Ok("00:00".to_string())
}

fn main() {
    tauri::Builder::default()
        // Register the commands we created above
        .invoke_handler(tauri::generate_handler![
            read_music_folder,
            get_audio_duration
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
      }
