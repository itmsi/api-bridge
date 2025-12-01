// Jenkinsfile untuk Core API MSI Server - Auto Deploy (Git Pull Only)
// Simpan sebagai Jenkinsfile di root repository

pipeline {
    agent any
    
    stages {
        stage('Git Pull - Auto Deploy') {
            steps {
                echo '📥 Auto deploying latest code from repository...'
                sh '''
                    # Git pull latest changes from develop branch
                    git pull origin develop
                    echo "✅ Auto deploy completed - code updated successfully!"
                '''
            }
            post {
                always {
                    echo '📋 Git Status After Pull:'
                    sh 'git status --short || echo "Could not get git status"'
                    echo '📄 Latest Commit Info:'
                    sh 'git log --oneline -1 || echo "No git info available"'
                }
            }
        }
        
        stage('Deployment Info') {
            steps {
                echo '📋 Deployment Information:'
                echo 'Repository: ' + env.JOB_NAME
                echo 'Branch: develop'
                echo 'Build Number: ' + env.BUILD_NUMBER
                echo 'Workspace: ' + env.WORKSPACE
                echo 'Deployment Time: ' + new Date().toString()
            }
        }
    }
    
    post {
        always {
            echo '✅ Auto Deploy Pipeline Completed!'
            echo 'Deployment finished at: ' + new Date().toString()
        }
        
        success {
            echo '🎉 Success: Auto deploy completed! Code updated successfully!'
            echo '📝 Server should now be running with latest code from develop branch'
        }
        
        failure {
            echo '❌ Failed: Auto deploy failed'
            echo '📋 Common issues to check:'
            echo '   - Network connection for git pull'
            echo '   - Repository access permissions'
            echo '   - Git branch configuration'
            echo '   - Disk space availability'
        }
    }
}