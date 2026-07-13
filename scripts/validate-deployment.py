import os
import fnmatch
import sys

def parse_gcloudignore(ignore_file_path):
    patterns = []
    if not os.path.exists(ignore_file_path):
        return patterns
    
    with open(ignore_file_path, 'r') as f:
        for line in f:
            line = line.strip()
            # Ignore comments and empty lines
            if not line or line.startswith('#'):
                continue
            patterns.append(line)
    return patterns

def matches_any_pattern(path_parts, patterns):
    # Standard gitignore-like matching
    # Check each part of the path and the full path
    full_path = "/".join(path_parts)
    for pattern in patterns:
        # Normalize pattern
        pat = pattern.rstrip('/')
        
        # Exact match or glob match
        if fnmatch.fnmatch(full_path, pat) or fnmatch.fnmatch(os.path.basename(full_path), pat):
            return True
        
        # Check parent directories
        for part in path_parts:
            if fnmatch.fnmatch(part, pat):
                return True
                
        # Handle trailing slash (directories)
        if pattern.endswith('/') and os.path.isdir(full_path):
            if fnmatch.fnmatch(full_path, pat) or fnmatch.fnmatch(os.path.basename(full_path), pat):
                return True
    return False

def validate():
    print("=========================================================")
    print("🔍 RUNNING PRE-DEPLOYMENT VALIDATION ENGINE")
    print("=========================================================")
    
    workspace_root = os.getcwd()
    gcloudignore_path = os.path.join(workspace_root, '.gcloudignore')
    
    if not os.path.exists(gcloudignore_path):
        print("❌ Error: .gcloudignore file not found at root!")
        sys.exit(1)
        
    patterns = parse_gcloudignore(gcloudignore_path)
    print(f"Loaded {len(patterns)} ignore patterns from .gcloudignore.")
    
    # Add hardcoded node_modules and .git check just in case
    if 'node_modules/' not in patterns:
        patterns.append('node_modules/')
    if '.git/' not in patterns:
        patterns.append('.git/')
        
    included_files = []
    forbidden_files = []
    broken_symlinks = []
    
    for root, dirs, files in os.walk(workspace_root):
        # Calculate relative path from workspace root
        rel_root = os.path.relpath(root, workspace_root)
        if rel_root == '.':
            path_parts = []
        else:
            path_parts = rel_root.split(os.sep)
            
        # Check if the directory itself matches ignore patterns to prune walk
        if path_parts and matches_any_pattern(path_parts, patterns):
            dirs[:] = [] # Clear subdirs so os.walk doesn't descend
            continue
            
        for file in files:
            file_parts = path_parts + [file]
            file_rel_path = os.path.join(rel_root, file) if rel_root != '.' else file
            
            # Check if file matches ignore patterns
            if matches_any_pattern(file_parts, patterns):
                continue
                
            full_path = os.path.join(root, file)
            
            # Check for broken symlinks
            if os.path.islink(full_path) and not os.path.exists(full_path):
                broken_symlinks.append(file_rel_path)
                continue
                
            # Check for forbidden files (extensions or paths)
            forbidden_extensions = ['.apk', '.aab', '.zip', '.tar', '.gz', '.tgz', '.keystore']
            _, ext = os.path.splitext(file.lower())
            
            if ext in forbidden_extensions:
                forbidden_files.append((file_rel_path, f"Forbidden extension: {ext}"))
                
            # Check for temporary or build-related files
            build_indicators = ['node_modules', '.gradle', 'build/', 'dist/', '.cache', 'temp', 'tmp']
            for ind in build_indicators:
                if ind in file_rel_path.replace(os.sep, '/'):
                    forbidden_files.append((file_rel_path, f"Matches build path indicator: {ind}"))
                    
            included_files.append(file_rel_path)
            
    print(f"\nTotal non-ignored files scanned: {len(included_files)}")
    
    if broken_symlinks:
        print("\n❌ BROKEN SYMLINKS DETECTED:")
        for sym in broken_symlinks:
            print(f"   - {sym}")
    else:
        print("✅ No broken symlinks detected.")
        
    if forbidden_files:
        print("\n❌ FORBIDDEN FILES DETECTED IN DEPLOYMENT LIST:")
        for f, reason in forbidden_files:
            print(f"   - {f} ({reason})")
    else:
        print("✅ No forbidden files (APKs, AABs, ZIPs, or Gradle/temp build files) detected in deployment list.")
        
    print("\n=========================================================")
    if broken_symlinks or forbidden_files:
        print("❌ VALIDATION FAILED: Please fix the issues above before deploying.")
        print("=========================================================")
        sys.exit(1)
    else:
        print("🎉 SUCCESS: ALL PRE-DEPLOYMENT VALIDATION CHECKS PASSED!")
        print("=========================================================")
        sys.exit(0)

if __name__ == "__main__":
    validate()
