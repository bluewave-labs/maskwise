#!/bin/bash

# Maskwise Production Deployment Script
# This script automates the deployment of Maskwise on a Linux server

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
INSTALL_DIR="/opt/maskwise"
SERVICE_USER="maskwise"
SERVICE_GROUP="maskwise"
SYSTEMD_SERVICE_FILE="/etc/systemd/system/maskwise.service"

# Functions
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  Maskwise Production Deployment${NC}"
    echo -e "${BLUE}================================${NC}"
    echo
}

print_step() {
    echo -e "${GREEN}[STEP]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root"
        exit 1
    fi
}

check_dependencies() {
    print_step "Checking system dependencies..."
    
    # Check if docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check if docker-compose is installed
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if git is installed
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed. Please install Git first."
        exit 1
    fi
    
    print_info "All dependencies are installed."
}

create_user() {
    print_step "Creating system user and group..."
    
    if ! getent group $SERVICE_GROUP > /dev/null 2>&1; then
        groupadd -r $SERVICE_GROUP
        print_info "Created group: $SERVICE_GROUP"
    else
        print_info "Group $SERVICE_GROUP already exists."
    fi
    
    if ! getent passwd $SERVICE_USER > /dev/null 2>&1; then
        useradd -r -g $SERVICE_GROUP -d $INSTALL_DIR -s /bin/bash $SERVICE_USER
        print_info "Created user: $SERVICE_USER"
    else
        print_info "User $SERVICE_USER already exists."
    fi
    
    # Add user to docker group
    usermod -aG docker $SERVICE_USER
}

setup_directories() {
    print_step "Setting up directories..."
    
    # Create installation directory
    mkdir -p $INSTALL_DIR
    mkdir -p $INSTALL_DIR/uploads
    mkdir -p $INSTALL_DIR/storage
    mkdir -p $INSTALL_DIR/nginx/ssl
    
    # Set ownership
    chown -R $SERVICE_USER:$SERVICE_GROUP $INSTALL_DIR
    chmod 755 $INSTALL_DIR
    chmod 755 $INSTALL_DIR/uploads
    chmod 755 $INSTALL_DIR/storage
    
    print_info "Directories created and configured."
}

clone_repository() {
    print_step "Cloning Maskwise repository..."
    
    if [ -d "$INSTALL_DIR/.git" ]; then
        print_info "Repository already exists. Pulling latest changes..."
        cd $INSTALL_DIR
        sudo -u $SERVICE_USER git pull origin main
    else
        print_info "Cloning repository..."
        sudo -u $SERVICE_USER git clone https://github.com/bluewave-labs/maskwise.git $INSTALL_DIR
        cd $INSTALL_DIR
        sudo -u $SERVICE_USER git checkout main
    fi
    
    # Set ownership after clone
    chown -R $SERVICE_USER:$SERVICE_GROUP $INSTALL_DIR
}

setup_environment() {
    print_step "Setting up environment configuration..."
    
    if [ ! -f "$INSTALL_DIR/.env" ]; then
        print_info "Creating production environment file..."
        cp $INSTALL_DIR/.env.production $INSTALL_DIR/.env
        chown $SERVICE_USER:$SERVICE_GROUP $INSTALL_DIR/.env
        chmod 600 $INSTALL_DIR/.env
        
        print_warning "IMPORTANT: Edit $INSTALL_DIR/.env and update the following:"
        print_warning "- POSTGRES_PASSWORD"
        print_warning "- JWT_SECRET"
        print_warning "- JWT_REFRESH_SECRET"
        print_warning "- DEFAULT_ADMIN_PASSWORD"
        echo
        read -p "Press Enter after you have edited the .env file..."
    else
        print_info "Environment file already exists."
    fi
}

install_systemd_service() {
    print_step "Installing systemd service..."
    
    cp $INSTALL_DIR/deployment/systemd/maskwise.service $SYSTEMD_SERVICE_FILE
    systemctl daemon-reload
    systemctl enable maskwise
    
    print_info "Systemd service installed and enabled."
}

build_and_start() {
    print_step "Building and starting Maskwise..."
    
    cd $INSTALL_DIR
    
    # Build images
    sudo -u $SERVICE_USER docker-compose -f docker-compose.production.yml build --no-cache
    
    # Start services
    sudo -u $SERVICE_USER docker-compose -f docker-compose.production.yml up -d
    
    print_info "Waiting for services to start..."
    sleep 30
    
    # Run database migrations
    sudo -u $SERVICE_USER docker-compose -f docker-compose.production.yml exec -T api npx prisma migrate deploy
    
    print_info "Maskwise is now running!"
}

setup_firewall() {
    print_step "Configuring firewall (optional)..."
    
    if command -v ufw &> /dev/null; then
        print_info "UFW detected. Configuring firewall rules..."
        ufw allow 22/tcp comment "SSH"
        ufw allow 80/tcp comment "HTTP - Maskwise"
        ufw allow 443/tcp comment "HTTPS - Maskwise"
        
        print_warning "Firewall rules added but not enabled."
        print_warning "Run 'ufw enable' to activate the firewall."
    else
        print_info "UFW not found. Skipping firewall configuration."
    fi
}

print_completion() {
    echo
    print_header
    echo -e "${GREEN}✅ Maskwise has been successfully deployed!${NC}"
    echo
    print_info "Access your Maskwise instance:"
    echo "  🌐 Frontend: http://$(hostname -I | awk '{print $1}')"
    echo "  🔧 API: http://$(hostname -I | awk '{print $1}')/api"
    echo
    print_info "Default admin credentials:"
    echo "  📧 Email: admin@maskwise.com"
    echo "  🔑 Password: (check your .env file)"
    echo
    print_info "Useful commands:"
    echo "  🔄 Restart: systemctl restart maskwise"
    echo "  📊 Status: systemctl status maskwise"
    echo "  📋 Logs: journalctl -u maskwise -f"
    echo "  🐳 Container logs: docker-compose -f $INSTALL_DIR/docker-compose.production.yml logs -f"
    echo
    print_warning "Next steps:"
    echo "1. Change the default admin password"
    echo "2. Configure SSL/TLS if needed"
    echo "3. Set up regular backups"
    echo "4. Monitor system performance"
    echo
}

# Main execution
main() {
    print_header
    
    check_root
    check_dependencies
    create_user
    setup_directories
    clone_repository
    setup_environment
    install_systemd_service
    build_and_start
    setup_firewall
    print_completion
}

# Run main function
main "$@"