//! CYRE Studio desktop shell.
//!
//! The window is a thin native host around the built Studio web bundle; all
//! editor logic lives in the TypeScript application, so the desktop and web
//! targets share one implementation.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![engine_version])
        .run(tauri::generate_context!())
        .expect("error while running CYRE Studio");
}

/// Reports the bundled engine version so the native shell can be verified
/// against the web build it hosts.
#[tauri::command]
fn engine_version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}
