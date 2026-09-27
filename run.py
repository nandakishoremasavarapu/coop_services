#!/usr/bin/env python3
"""
Shram Setu - Automated Startup Script
======================================
This script automatically:
1. Validates the environment (Node.js, npm, Python).
2. Sets up environment variables (.env files for frontend & backend).
3. Installs all project dependencies (backend venv & frontend node_modules).
4. Launches the full-stack app:
     - FastAPI backend  (MongoDB Atlas / in-memory mock)  -> port 8000
     - Next.js frontend                                        -> port 3000
5. Automatically detects server readiness and opens the app in your browser.
6. Handles graceful shutdown on Ctrl+C.

Usage:
    python run.py                 # start everything
    python run.py --no-browser    # do not open the browser automatically
    python run.py --port 3000     # choose the frontend port
    python run.py --install       # force reinstall dependencies
"""

import os
import sys
import time
import socket
import shutil
import secrets
import urllib.request
import urllib.error
import webbrowser
import threading
import subprocess
import argparse
from pathlib import Path

BACKEND_PORT = 8000

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


def get_python_command() -> str:
    """Python executable to use for the backend venv (current interpreter)."""
    return sys.executable or "python"


def setup_environment(project_dir: Path) -> None:
    """Ensure .env files exist with sensible defaults (never overwrite)."""
    # ---- Frontend .env ---------------------------------------------------
    frontend_env = project_dir / ".env"
    if not frontend_env.exists():
        log_info("Creating frontend .env (Next.js)...")
        frontend_env.write_text(
            "# Environment configuration for Shram Setu (frontend)\n"
            f"NEXT_PUBLIC_API_BASE_URL=\"http://localhost:{BACKEND_PORT}\"\n"
            "NODE_ENV=\"development\"\n"
            "PORT=3000\n",
            encoding="utf-8",
        )
        log_success(f"Created {frontend_env} pointing at the FastAPI backend on port {BACKEND_PORT}.")
    else:
        log_info("Frontend .env configuration found.")

    # ---- Backend .env ----------------------------------------------------
    backend_env = project_dir / "backend" / ".env"
    if not backend_env.exists():
        log_info("Creating backend/.env (FastAPI)...")
        backend_env.write_text(
            "# Shram Setu backend configuration\n"
            "# Paste your MongoDB Atlas connection string below (Atlas -> Connect -> Drivers).\n"
            "# While empty, the backend runs on an in-memory mock database (data is NOT saved).\n"
            "MONGODB_URI=\n"
            "MONGODB_DB_NAME=shram_setu\n"
            f"SECRET_KEY={secrets.token_hex(32)}\n"
            "SESSION_TTL_DAYS=7\n"
            "CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000\n"
            "PLATFORM_FEE_PCT=0.10\n"
            "SEED_ON_START=true\n",
            encoding="utf-8",
        )
        log_success("Created backend/.env with a generated SECRET_KEY.")
        log_warn("IMPORTANT: open backend/.env and set MONGODB_URI to your MongoDB Atlas")
        log_warn("connection string. Until then the backend uses a temporary in-memory database.")
    else:
        if "MONGODB_URI=mongodb" in backend_env.read_text(encoding="utf-8"):
            log_success("Backend .env found with a MongoDB connection string configured.")
        else:
            log_info("Backend .env found (MONGODB_URI empty -> in-memory mock database will be used).")


def install_dependencies(project_dir: Path, npm_cmd: str, force: bool = False) -> None:
    """Installs npm dependencies if node_modules is missing or force=True."""
    node_modules = project_dir / "node_modules"

    if node_modules.exists() and not force:
        log_info("node_modules found. Frontend dependencies are ready (use --install to force re-install).")
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
            log_success("Frontend dependencies installed successfully.")
    except subprocess.CalledProcessError as e:
        log_error(f"Failed to install dependencies: {e}")
        sys.exit(1)
    except FileNotFoundError:
        log_error(f"Could not execute '{npm_cmd}'. Please ensure Node.js and npm are installed in your PATH.")
        sys.exit(1)


def setup_backend(project_dir: Path, force: bool = False) -> None:
    """Create the backend virtual environment and install requirements."""
    backend_dir = project_dir / "backend"
    venv_dir = backend_dir / ".venv"

    if sys.platform == "win32":
        pip_cmd = venv_dir / "Scripts" / "pip.exe"
        python_cmd = venv_dir / "Scripts" / "python.exe"
    else:
        pip_cmd = venv_dir / "bin" / "pip"
        python_cmd = venv_dir / "bin" / "python"

    if venv_dir.exists() and pip_cmd.exists() and not force:
        log_info("Backend virtual environment found (.venv).")
    else:
        log_info("Creating backend Python virtual environment...")
        try:
            subprocess.run(
                [get_python_command(), "-m", "venv", str(venv_dir)],
                cwd=str(backend_dir),
                check=True,
            )
            log_success("Virtual environment created at backend/.venv")
        except subprocess.CalledProcessError as e:
            log_error(f"Failed to create the virtual environment: {e}")
            log_error("Make sure the 'venv' module is available (python -m venv).")
            sys.exit(1)

    marker = venv_dir / ".requirements.installed"
    req_file = backend_dir / "requirements.txt"
    if marker.exists() and req_file.stat().st_mtime < marker.stat().st_mtime and not force:
        log_info("Backend dependencies are up to date.")
        return

    log_info("Installing backend Python dependencies (FastAPI, Motor, bcrypt)...")
    try:
        subprocess.run(
            [str(pip_cmd), "install", "-r", str(req_file), "--quiet"],
            cwd=str(backend_dir),
            check=True,
        )
        marker.touch()
        log_success("Backend dependencies installed successfully.")
    except subprocess.CalledProcessError as e:
        log_error(f"Failed to install backend dependencies: {e}")
        sys.exit(1)


def wait_and_open_browser(target_url: str, port: int, stop_event: threading.Event):
    """Waits until the server is reachable and then opens the default browser."""
    log_info(f"Waiting for server to become ready on port {port}...")
    start_time = time.time()
    max_wait_seconds = 180

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
                # Port is accepting connections but the server is still initializing
                pass

        time.sleep(0.5)

    if stop_event.is_set():
        return

    print("\n" + "=" * 60)
    log_success(f"Application is LIVE at {Colors.BOLD}{target_url}{Colors.RESET}")
    log_info(f"FastAPI backend : http://localhost:{BACKEND_PORT}  (docs: /docs)")
    log_info(f"MongoDB         : configured via backend/.env -> MONGODB_URI")
    log_info("Opening the app in your default web browser...")
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
            subprocess.run(
                ["taskkill", "/T", "/PID", str(pid)],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False
            )
            time.sleep(1)
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(pid)],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False
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


def main():
    # Enable ANSI colors on Windows terminals
    if sys.platform == "win32":
        os.system("")

    parser = argparse.ArgumentParser(description="Shram Setu - Automated Launch Script")
    parser.add_argument("--install", action="store_true", help="Force reinstall dependencies")
    parser.add_argument("--no-browser", action="store_true", help="Do not open browser automatically")
    parser.add_argument("--port", type=int, default=3000, help="Frontend port (default: 3000)")
    parser.add_argument("--backend-port", type=int, default=BACKEND_PORT, help="Backend port (default: 8000)")
    args = parser.parse_args()

    global BACKEND_PORT
    BACKEND_PORT = args.backend_port

    project_dir = Path(__file__).resolve().parent
    backend_dir = project_dir / "backend"
    port = args.port
    app_url = f"http://localhost:{port}"

    print(f"\n{Colors.BOLD}{Colors.HEADER}====================================================")
    print("        SHRAM SETU - AUTOMATED LAUNCHER")
    print(f"===================================================={Colors.RESET}")
    print(f"{Colors.DIM}Project Root: {project_dir}{Colors.RESET}")
    print(f"{Colors.DIM}Backend     : FastAPI + MongoDB Atlas{Colors.RESET}\n")

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

    python_cmd = get_python_command()
    log_success(f"Python detected ({python_cmd})")

    # STEP 2: Configure Environment
    log_step(2, TOTAL_STEPS, "Configuring Environment (.env files)")
    setup_environment(project_dir)

    # STEP 3: Install Dependencies
    log_step(3, TOTAL_STEPS, "Checking & Installing Dependencies")
    install_dependencies(project_dir, npm_cmd, force=args.install)
    setup_backend(project_dir, force=args.install)

    # STEP 4: Database (backend connects and auto-seeds on startup)
    log_step(4, TOTAL_STEPS, "Preparing FastAPI Backend (MongoDB)")
    free_port(BACKEND_PORT)
    log_info("The backend seeds initial data automatically on startup (idempotent).")
    log_info("If this is the first run, edit backend/.env and set MONGODB_URI to your")
    log_info("MongoDB Atlas connection string for persistent storage.")

    if sys.platform == "win32":
        uvicorn_cmd = str(backend_dir / ".venv" / "Scripts" / "python.exe")
    else:
        uvicorn_cmd = str(backend_dir / ".venv" / "bin" / "python")
    backend_process = subprocess.Popen(
        [uvicorn_cmd, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", str(BACKEND_PORT)],
        cwd=str(backend_dir),
        shell=False,
    )
    log_info(f"FastAPI backend starting on http://localhost:{BACKEND_PORT} (docs at /docs)")

    # Wait for the backend health endpoint before starting the frontend.
    backend_healthy = False
    for _ in range(60):
        if is_port_in_use(BACKEND_PORT):
            try:
                with urllib.request.urlopen(
                    f"http://localhost:{BACKEND_PORT}/api/health", timeout=1.5
                ) as resp:
                    if resp.status == 200:
                        backend_healthy = True
                        break
            except Exception:
                pass
        time.sleep(0.5)
    if backend_healthy:
        log_success("FastAPI backend is healthy (database connected & seeded).")
    else:
        log_warn("Backend health check did not pass yet - the frontend will still start.")
        log_warn("Check the backend logs above and your backend/.env MONGODB_URI setting.")

    # STEP 5: Launch frontend server
    log_step(5, TOTAL_STEPS, f"Starting Next.js Frontend on port {port}")
    free_port(port)
    log_info(f"Target URL: {Colors.BOLD}{app_url}{Colors.RESET}")
    log_info("Press Ctrl+C at any time to gracefully shut down both servers.\n")

    stop_event = threading.Event()
    browser_thread = None

    if not args.no_browser:
        browser_thread = threading.Thread(
            target=wait_and_open_browser,
            args=(app_url, port, stop_event),
            daemon=True
        )
        browser_thread.start()

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
        log_info("Shutdown signal (Ctrl+C) received. Stopping servers...")
    finally:
        stop_event.set()
        if dev_process and dev_process.poll() is None:
            log_info("Terminating frontend process tree...")
            kill_process_tree(dev_process.pid)
            try:
                dev_process.terminate()
                dev_process.wait(timeout=3)
            except Exception:
                dev_process.kill()
        if backend_process and backend_process.poll() is None:
            log_info("Terminating backend process...")
            kill_process_tree(backend_process.pid)
            try:
                backend_process.terminate()
                backend_process.wait(timeout=3)
            except Exception:
                backend_process.kill()
        log_success("Application shut down cleanly. Goodbye!")


if __name__ == "__main__":
    main()
