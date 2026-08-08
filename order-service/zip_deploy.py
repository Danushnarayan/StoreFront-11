import os
import zipfile

def create_lambda_zip():
    zip_name = 'deploy_ready.zip'
    exclude_dirs = {'tests', 'test_deploy', '__pycache__', '.pytest_cache', '.git'}
    
    if os.path.exists(zip_name):
        os.remove(zip_name)
        
    with zipfile.ZipFile(zip_name, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk('.'):
            # Exclude unwanted directories
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            
            for file in files:
                if file.endswith('.zip') or file == 'zip_deploy.py':
                    continue
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, '.')
                zipf.write(file_path, arcname)
                
    print(f"Successfully created {zip_name}!")

if __name__ == '__main__':
    create_lambda_zip()
