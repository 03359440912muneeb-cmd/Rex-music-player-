fn main() {
    // 1. Compile the C++ code
    cc::Build::new()
        .cpp(true) // Enable C++ compilation
        .file("cpp/audio_engine.cpp")
        .compile("audio_engine");

    // 2. Tell Rust to link the compiled static library
    println!("cargo:rustc-link-lib=static=audio_engine");

    // 3. Standard Tauri build script
    tauri_build::build()
}
