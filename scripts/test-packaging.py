import os
import zipfile
import tempfile
import fnmatch
import sys

def parse_ignore_file(file_path):
    patterns = []
    if not os.path.exists(file_path):
        return patterns
    with open(file_path, "r") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            # Normalize pattern: remove trailing slash for more robust matching
            patterns.append(line)
    return patterns

def matches_any_pattern(path_parts, patterns):
    full_path = "/".join(path_parts)
    for pattern in patterns:
        pat = pattern.rstrip("/")
        # Check direct glob matching on full path or filename
        if fnmatch.fnmatch(full_path, pat) or fnmatch.fnmatch(os.path.basename(full_path), pat):
            return True
        # Check if any parent directory matches the pattern
        for part in path_parts:
            if fnmatch.fnmatch(part, pat):
                return True
        # Handle recursive directory matching
        if pattern.endswith("/") and os.path.isdir(full_path):
            if fnmatch.fnmatch(full_path, pat) or fnmatch.fnmatch(os.path.basename(full_path), pat):
                return True
    return False

def test_packaging():
    print("=========================================================")
    print("📦 RUNNING PACKAGING INTEGRITY & DEPLOYMENT TEST")
    print("=========================================================")
    
    workspace_root = os.getcwd()
    gcloudignore_path = os.path.join(workspace_root, ".gcloudignore")
    
    if not os.path.exists(gcloudignore_path):
        print("❌ Error: .gcloudignore not found!")
        sys.exit(1)
        
    patterns = parse_ignore_file(gcloudignore_path)
    # Ensure critical directories are always ignored in the web deployment
    extra_ignores = ["node_modules", ".git", "dist", "android", ".gradle", ".cache", ".npm", "tmp", "temp"]
    for ext in extra_ignores:
        if ext not in patterns and (ext + "/") not in patterns:
            patterns.append(ext)
            
    print(f"Parsed {len(patterns)} patterns from .gcloudignore (with extra guards).")
    
    # Create a temporary zip file
    fd, temp_zip_path = tempfile.mkstemp(suffix=".zip")
    os.close(fd)
    
    forbidden_files = []
    included_files = []
    forbidden_extensions = [".apk", ".aab", ".zip", ".tar", ".gz", ".tgz", ".keystore"]
    build_indicators = ["node_modules", ".gradle", "build", "dist", ".cache", "temp", "tmp"]
    
    try:
        with zipfile.ZipFile(temp_zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(workspace_root):
                rel_root = os.path.relpath(root, workspace_root)
                if rel_root == ".":
                    path_parts = []
                else:
                    path_parts = rel_root.split(os.sep)
                    
                # Prune directory tree walk using ignore patterns
                if path_parts and matches_any_pattern(path_parts, patterns):
                    dirs[:] = []
                    continue
                    
                for file in files:
                    file_parts = path_parts + [file]
                    file_rel_path = os.path.join(rel_root, file) if rel_root != "." else file
                    
                    if matches_any_pattern(file_parts, patterns):
                        continue
                        
                    full_path = os.path.join(root, file)
                    
                    # Verify no broken symlinks
                    if os.path.islink(full_path) and not os.path.exists(full_path):
                        print(f"❌ Broken symlink: {file_rel_path}")
                        sys.exit(1)
                        
                    # Check for forbidden files/extensions
                    _, ext = os.path.splitext(file.lower())
                    if ext in forbidden_extensions:
                        forbidden_files.append((file_rel_path, f"Forbidden extension: {ext}"))
                        
                    for ind in build_indicators:
                        # Check as a path segment rather than a simple substring to avoid matching filenames like run-build.ts
                        segments = file_rel_path.replace(os.sep, "/").split("/")
                        if ind in segments:
                            forbidden_files.append((file_rel_path, f"Matches build path indicator: {ind}"))
                            
                    # Add file to ZIP
                    zipf.write(full_path, file_rel_path)
                    included_files.append(file_rel_path)
                    
        # Check ZIP size
        zip_size_bytes = os.path.getsize(temp_zip_path)
        zip_size_mb = zip_size_bytes / (1024 * 1024)
        print(f"Generated ZIP size: {zip_size_mb:.2f} MB")
        
        # Test extraction
        print("Testing extraction of deployment package...")
        with tempfile.TemporaryDirectory() as temp_dir:
            with zipfile.ZipFile(temp_zip_path, "r") as zipf:
                zipf.extractall(temp_dir)
                extracted_files = []
                for root, dirs, files in os.walk(temp_dir):
                    for file in files:
                        rel = os.path.relpath(os.path.join(root, file), temp_dir)
                        extracted_files.append(rel)
                
                print(f"Successfully extracted {len(extracted_files)} files from ZIP.")
                if len(extracted_files) != len(included_files):
                    print("❌ Error: Extracted file count mismatch!")
                    sys.exit(1)
                    
        print("✅ Archive extraction verified successfully.")
        
    finally:
        if os.path.exists(temp_zip_path):
            os.remove(temp_zip_path)
            
    if forbidden_files:
        print("\n❌ FORBIDDEN FILES WOULD BE INCLUDED:")
        for f, reason in forbidden_files:
            print(f"   - {f} ({reason})")
        sys.exit(1)
    else:
        print("✅ No forbidden files are included in the deployment package.")
        
    print(f"Total files in package: {len(included_files)}")
    print("=========================================================")
    print("🎉 SUCCESS: DEPLOYMENT PACKAGE VERIFIED & UNPACKED SUCCESSFULLY!")
    print("=========================================================")
    sys.exit(0)

if __name__ == "__main__":
    test_packaging()
