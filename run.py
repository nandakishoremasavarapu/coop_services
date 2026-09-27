#!/usr/bin/env python3
"""
Coop Service - Automated Startup Script
======================================
This script automatically:
1. Validates the environment (Node.js, npm, Python).
2. Sets up environment variables (.env).
3. Installs all project dependencies (backend & frontend).
4. Launches the full-stack server (Next.js handling both API backend & UI frontend).
5. Automatically detects server readiness and opens the app in your browser.
6. Handles graceful shutdown on Ctrl+C.
"""

import os
import sys
import time
import socket
import shutil
import urllib.request
import urllib.error
import webbrowser
import threading
import subprocess
import argparse
from pathlib import Path

# ANSI color formatting
class Colors:
    HEADER = "\033[95m"
    BLUE = "\033[94m"
    CYAN = "\033[96m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    RESET = "\033[0m"

def log_info(msg: str):
    print(f"{Colors.BLUE}[INFO]{Colors.RESET} {msg}")

def log_success(msg: str):
    print(f"{Colors.GREEN}[SUCCESS]{Colors.RESET} {msg}")

def log_warn(msg: str):
    print(f"{Colors.YELLOW}[WARNING]{Colors.RESET} {msg}")

def log_error(msg: str):
    print(f"{Colors.RED}[ERROR]{Colors.RESET} {msg}")

def log_step(step: int, total: int, title: str):
    print(f"\n{Colors.BOLD}{Colors.CYAN}[{step}/{total}] {title}{Colors.RESET}")

def is_port_in_use(port: int, host: str = "127.0.0.1") -> bool:
    """Check if a port is actively open and listening."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((host, port)) == 0

def free_port(port: int):
    """Attempt to free a port if occupied by a lingering process."""
    if not is_port_in_use(port):
        return
    log_warn(f"Port {port} is currently in use. Attempting to free it...")
    if sys.platform == "win32":
        try:
            cmd = f'powershell -Command "Get-NetTCPConnection -LocalPort {port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess"'
            output = subprocess.check_output(cmd, shell=True, text=True).strip()
            for pid in output.split():
                pid = pid.strip()
                if pid and pid.isdigit() and int(pid) > 0:
                    log_info(f"Terminating lingering process (PID {pid}) on port {port}...")
                    subprocess.run(["taskkill", "/F", "/PID", pid], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
            time.sleep(1)
        except Exception as e:
            log_warn(f"Could not automatically clear port {port}: {e}")
    else:
        try:
            output = subprocess.check_output(f"lsof -ti:{port}", shell=True, text=True).strip()
            for pid in output.split():
                if pid.isdigit():
                    subprocess.run(["kill", "-9", pid], check=False)
            time.sleep(1)
        except Exception:
            pass


def check_postgres():
    """Check if PostgreSQL appears to be listening on port 5432."""
    if not is_port_in_use(5432):
        log_warn("PostgreSQL does not appear to be running on 127.0.0.1:5432.")
        log_warn("The web server will start, but database operations may require a running")
        log_warn("PostgreSQL database or an updated DATABASE_URL inside your .env file.")
    else:
        log_success("PostgreSQL detected on port 5432.")

def get_npm_command() -> str:
    """Find the npm executable compatible with Windows or Unix."""
    if sys.platform == "win32":
        npm_cmd = shutil.which("npm.cmd") or shutil.which("npm.exe") or shutil.which("npm")
        if npm_cmd:
            return npm_cmd
    else:
        npm_cmd = shutil.which("npm")
        if npm_cmd:
            return npm_cmd
    return "npm"

def setup_environment(project_dir: Path) -> Path:
    """Ensure .env exists with required default configuration."""
    env_file = project_dir / ".env"
    default_db_url = "postgresql://postgres:postgres@127.0.0.1:5432/app_db"
    
    if not env_file.exists():
        log_info("Creating default .env file...")
        content = (
            "# Environment configuration for Coop Service\n"
            f"DATABASE_URL=\"{default_db_url}\"\n"
            "NODE_ENV=\"development\"\n"
            "PORT=3000\n"
        )
        env_file.write_text(content, encoding="utf-8")
        log_success("Created .env with default DATABASE_URL.")
    else:
        log_info(".env configuration file found.")
    
    return env_file

def install_dependencies(project_dir: Path, npm_cmd: str, force: bool = False):
    """Installs npm dependencies if node_modules is missing or force=True."""
    node_modules = project_dir / "node_modules"
    
    if node_modules.exists() and not force:
        log_info("node_modules found. Dependencies are ready (use --install to force re-install).")
        return
    
    log_info(f"Running '{npm_cmd} install --no-audit --no-fund'... This may take a moment.")
    try:
        use_shell = sys.platform == "win32"
        proc = subprocess.run(
            [npm_cmd, "install", "--no-audit", "--no-fund"],
            cwd=str(project_dir),
            shell=use_shell,
            check=True
        )
        if proc.returncode == 0:
            log_success("All dependencies installed successfully.")
    except subprocess.CalledProcessError as e:
        log_error(f"Failed to install dependencies: {e}")
        sys.exit(1)
    except FileNotFoundError:
        log_error(f"Could not execute '{npm_cmd}'. Please ensure Node.js and npm are installed in PATH.")
        sys.exit(1)

def wait_and_open_browser(target_url: str, port: int, stop_event: threading.Event):
    """Waits until the server is reachable and then opens the default browser."""
    log_info(f"Waiting for server to become ready on port {port}...")
    start_time = time.time()
    max_wait_seconds = 120

    while not stop_event.is_set():
        if time.time() - start_time > max_wait_seconds:
            log_warn(f"Timed out waiting for server after {max_wait_seconds}s. Please check terminal logs.")
            return

        # Check if port is open
        if is_port_in_use(port):
            try:
                req = urllib.request.Request(target_url, headers={"User-Agent": "HealthCheck"})
                with urllib.request.urlopen(req, timeout=1.5) as resp:
                    # HTTP response received
                    break
            except urllib.error.HTTPError:
                # Any HTTP response code (200, 302, 404, etc.) confirms the server is live
                break
            except Exception:
                # Port is accepting connections but Next.js is still initializing
                pass

        time.sleep(0.5)

    if stop_event.is_set():
        return

    print("\n" + "=" * 60)
    log_success(f"Application is LIVE at {Colors.BOLD}{target_url}{Colors.RESET}")
    log_info("Opening in your default web browser...")
    print("=" * 60 + "\n")

    try:
        webbrowser.open(target_url)
    except Exception as e:
        log_warn(f"Could not open browser automatically: {e}")
        log_info(f"Please open your browser manually and visit: {target_url}")

def kill_process_tree(pid: int):
    """Safely terminate a process and all its child processes."""
    if sys.platform == "win32":
        try:
            # First try graceful termination so node.js can flush PGlite WAL and close files
            subprocess.run(
                ["taskkill", "/T", "/PID", str(pid)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=False
            )
            time.sleep(1)
            # Force kill if still lingering
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(pid)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=False
            )
        except Exception:
            pass
    else:
        try:
            import signal
            os.killpg(os.getpgid(pid), signal.SIGTERM)
            time.sleep(1)
            os.killpg(os.getpgid(pid), signal.SIGKILL)
        except Exception:
            pass

def init_database(project_dir: Path, npm_cmd: str):
    """Ensures database schema and seed data are initialized."""
    log_info("Verifying database readiness and initial seed data...")
    use_shell = sys.platform == "win32"
    try:
        subprocess.run(
            [npm_cmd, "run", "db:init"],
            cwd=str(project_dir),
            shell=use_shell,
            check=True
        )
        log_success("Database schema and demo accounts are ready.")
    except Exception as e:
        log_warn(f"Initial database check reported: {e}. Retrying with auto-repair...")
        try:
            local_app_data = os.environ.get("LOCALAPPDATA", "")
            if local_app_data:
                pid_file = Path(local_app_data) / "coop_service_pgdata" / "postmaster.pid"
                if pid_file.exists():
                    try:
                        pid_file.unlink()
                    except Exception:
                        pass
            subprocess.run(
                [npm_cmd, "run", "db:init"],
                cwd=str(project_dir),
                shell=use_shell,
                check=True
            )
            log_success("Database schema and demo accounts are ready.")
        except Exception as retry_err:
            log_warn(f"Database auto-initialization check: {retry_err}")

def main():
    # Enable ANSI colors on Windows terminals
    if sys.platform == "win32":
        os.system("")

    parser = argparse.ArgumentParser(description="Coop Service - Automated Startup Script")
    parser.add_argument("--install", action="store_true", help="Force reinstall dependencies")
    parser.add_argument("--no-browser", action="store_true", help="Do not open browser automatically")
    parser.add_argument("--port", type=int, default=3000, help="Port to run the application on (default: 3000)")
    args = parser.parse_args()

    project_dir = Path(__file__).resolve().parent
    port = args.port
    app_url = f"http://localhost:{port}"

    print(f"\n{Colors.BOLD}{Colors.HEADER}====================================================")
    print("        COOP SERVICE - AUTOMATED LAUNCHER")
    print(f"===================================================={Colors.RESET}")
    print(f"{Colors.DIM}Project Root: {project_dir}{Colors.RESET}\n")

    TOTAL_STEPS = 5

    # STEP 1: Verify tools
    log_step(1, TOTAL_STEPS, "Verifying Tools & Prerequisites")
    node_cmd = shutil.which("node")
    if not node_cmd:
        log_error("Node.js was not found in your PATH.")
        log_error("Please download and install Node.js from: https://nodejs.org/")
        sys.exit(1)
    
    try:
        node_version = subprocess.check_output([node_cmd, "--version"], text=True).strip()
        log_success(f"Node.js detected ({node_version})")
    except Exception:
        log_success("Node.js detected.")

    npm_cmd = get_npm_command()
    if not npm_cmd:
        log_error("npm was not found in your PATH.")
        sys.exit(1)
    log_success(f"Package manager detected ({npm_cmd})")

    # STEP 2: Configure Environment
    log_step(2, TOTAL_STEPS, "Configuring Environment (.env)")
    setup_environment(project_dir)
    check_postgres()

    # STEP 3: Install Dependencies
    log_step(3, TOTAL_STEPS, "Checking & Installing Dependencies")
    install_dependencies(project_dir, npm_cmd, force=args.install)

    # STEP 4: Initialize & Seed Database
    log_step(4, TOTAL_STEPS, "Initializing & Verifying Database")
    init_database(project_dir, npm_cmd)

    # STEP 5: Launch Full-Stack Server
    log_step(5, TOTAL_STEPS, f"Starting Full-Stack Server on port {port}")
    free_port(port)
    log_info("Both Backend (API routes) and Frontend (UI pages) are running together via Next.js.")
    log_info(f"Target URL: {Colors.BOLD}{app_url}{Colors.RESET}")
    log_info("Press Ctrl+C at any time to gracefully shut down the server.\n")

    stop_event = threading.Event()
    browser_thread = None

    if not args.no_browser:
        browser_thread = threading.Thread(
            target=wait_and_open_browser,
            args=(app_url, port, stop_event),
            daemon=True
        )
        browser_thread.start()

    # Configure dev server command
    server_env = os.environ.copy()
    server_env["PORT"] = str(port)

    use_shell = sys.platform == "win32"
    dev_process = None

    try:
        cmd = [npm_cmd, "run", "dev", "--", "-p", str(port)]
        dev_process = subprocess.Popen(
            cmd,
            cwd=str(project_dir),
            env=server_env,
            shell=use_shell
        )
        # Wait for dev process
        dev_process.wait()

    except KeyboardInterrupt:
        print("\n")
        log_info("Shutdown signal (Ctrl+C) received. Stopping server...")
    finally:
        stop_event.set()
        if dev_process and dev_process.poll() is None:
            log_info("Terminating server process tree...")
            kill_process_tree(dev_process.pid)
            try:
                dev_process.terminate()
                dev_process.wait(timeout=3)
            except Exception:
                dev_process.kill()
        log_success("Application shut down cleanly. Goodbye!")

if __name__ == "__main__":
    main()
