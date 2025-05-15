#!/bin/bash

# Function to display usage instructions
show_usage() {
    echo "GitHub Dashboard Docker Environment Management"
    echo ""
    echo "Usage:"
    echo "  ./start.sh [command]"
    echo ""
    echo "Commands:"
    echo "  up        - Start the environment (default)"
    echo "  down      - Stop the environment"
    echo "  restart   - Restart the environment"
    echo "  logs      - Show container logs"
    echo "  rebuild   - Rebuild and restart containers"
    echo "  clean     - Remove all containers and images"
    echo ""
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo "Error: Docker is not running or not installed"
        exit 1
    fi
}

# Main script logic
check_docker

case "$1" in
    "up" | "")
        echo "Starting GitHub Dashboard environment..."
        docker-compose up -d
        echo "Environment is up! Access the application at http://localhost:3000"
        ;;
    "down")
        echo "Stopping environment..."
        docker-compose down
        ;;
    "restart")
        echo "Restarting environment..."
        docker-compose restart
        ;;
    "logs")
        docker-compose logs -f
        ;;
    "rebuild")
        echo "Rebuilding environment..."
        docker-compose down
        docker-compose build --no-cache
        docker-compose up -d
        echo "Environment rebuilt and started!"
        ;;
    "clean")
        echo "Cleaning up environment..."
        docker-compose down --rmi all --volumes --remove-orphans
        echo "Environment cleaned!"
        ;;
    *)
        show_usage
        exit 1
        ;;
esac 