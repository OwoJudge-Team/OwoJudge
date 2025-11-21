#!/bin/bash

# Docker Compose Helper Scripts for OwoJudge Backend

COMPOSE="docker compose"

case "$1" in
  "create-user")
    # Create a test user
    # Usage: ./docker-helper.sh create-user [username] [password] [displayName] [isAdmin]
    shift
    $COMPOSE exec backend node scripts/create-test-user.js "$@"
    ;;
    
  "delete-user")
    # Delete a user
    # Usage: ./docker-helper.sh delete-user [username]
    shift
    $COMPOSE exec backend node scripts/delete-user.js "$@"
    ;;
    
  "init-admin")
    # Initialize admin user
    # Usage: ./docker-helper.sh init-admin
    $COMPOSE exec backend node scripts/init-admin.js
    ;;
    
  "logs")
    # View backend logs
    # Usage: ./docker-helper.sh logs
    $COMPOSE logs -f backend
    ;;
    
  "shell")
    # Open shell in backend container
    # Usage: ./docker-helper.sh shell
    $COMPOSE exec backend /bin/bash
    ;;
    
  "restart")
    # Restart backend service
    # Usage: ./docker-helper.sh restart
    $COMPOSE restart backend
    ;;
    
  "rebuild")
    # Rebuild and restart backend
    # Usage: ./docker-helper.sh rebuild
    $COMPOSE up -d --build backend
    ;;
    
  "test-auth")
    # Test authentication system
    # Usage: ./docker-helper.sh test-auth
    $COMPOSE exec backend node scripts/test-auth.js
    ;;
    
  "diagnose")
    # Run authentication diagnosis
    # Usage: ./docker-helper.sh diagnose
    $COMPOSE exec backend node scripts/diagnose-auth.js
    ;;
    
  *)
    echo "OwoJudge Docker Helper"
    echo ""
    echo "Usage: ./docker-helper.sh [command] [args...]"
    echo ""
    echo "Commands:"
    echo "  create-user [username] [password] [displayName] [isAdmin]"
    echo "              Create a test user (defaults: testuser/password123)"
    echo ""
    echo "  delete-user [username]"
    echo "              Delete a user"
    echo ""
    echo "  init-admin  Initialize admin user"
    echo ""
    echo "  logs        View backend logs (follow mode)"
    echo ""
    echo "  shell       Open bash shell in backend container"
    echo ""
    echo "  restart     Restart backend service"
    echo ""
    echo "  rebuild     Rebuild and restart backend (after code changes)"
    echo ""
    echo "  test-auth   Test authentication system"
    echo ""
    echo "  diagnose    Run authentication diagnosis"
    echo ""
    echo "Examples:"
    echo "  ./docker-helper.sh create-user"
    echo "  ./docker-helper.sh create-user alice alice123 'Alice Wang' false"
    echo "  ./docker-helper.sh delete-user testuser"
    echo "  ./docker-helper.sh logs"
    ;;
esac
