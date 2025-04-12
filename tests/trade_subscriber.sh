#!/bin/bash

# trade_subscriber.sh - WebSocket client for Panomarket
# This script connects to the Panomarket WebSocket API and displays trade data

# Colors for formatting output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default values
read -p "Enter host (default: localhost:8787): " input_host
HOST=${input_host:-"localhost:8787"}
read -p "Enter asset pair (default: BTC:USD): " input_asset
ASSET=${input_asset:-"BTC:USD"}
PRETTY_PRINT=true

# Function to print usage information
print_usage() {
    echo "Usage: $0 [options]"
    echo
    echo "Options:"
    echo "  -h, --host HOST       Specify host (default: localhost:8787)"
    echo "  -a, --asset ASSET     Specify asset pair (default: BTC_USD)"
    echo "  -r, --raw             Display raw JSON without formatting"
    echo "  --help                Display this help message"
    echo
    echo "Example:"
    echo "  $0 --host api.panomarket.com --asset ETH_USD"
}

# Parse command-line arguments
while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
        -h|--host)
            HOST="$2"
            shift 2
            ;;
        -a|--asset)
            ASSET="$2"
            shift 2
            ;;
        -r|--raw)
            PRETTY_PRINT=false
            shift
            ;;
        --help)
            print_usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            print_usage
            exit 1
            ;;
    esac
done

# Check if websocat is installed
if ! command -v websocat &> /dev/null; then
    echo -e "${RED}Error: websocat is not installed${NC}"
    echo "Please install websocat to use this script:"
    echo "  On Ubuntu/Debian: sudo apt-get install -y websocat"
    echo "  On macOS with Homebrew: brew install websocat"
    echo "  Or download from: https://github.com/vi/websocat/releases"
    exit 1
fi

# Build WebSocket URL
WS_URL="ws://$HOST/ws/$ASSET"

echo -e "${GREEN}Connecting to $WS_URL...${NC}"

# Connect to WebSocket and process messages
websocat "$WS_URL" | while read -r message; do
    if [ "$PRETTY_PRINT" = true ]; then
        # Parse and display the trade data in a nice format
        echo -e "${YELLOW}Trade received at $(date '+%Y-%m-%d %H:%M:%S')${NC}"
        
        # Use jq to parse JSON if available
        if command -v jq &> /dev/null; then
            # Process array of trades (can be multiple trades in one message)
            echo "$message" | jq -r '.[] | "\n'"${BLUE}"'Asset pair: \(.buy_asset)/\(.sell_asset)\n'"${CYAN}"'Price: \(.price)\n'"${CYAN}"'Quantity: \(.quantity)\n'"${CYAN}"'Timestamp: \(.timestamp)\n'"${CYAN}"'Buy Order ID: \(.buy_order_id)\n'"${CYAN}"'Sell Order ID: \(.sell_order_id)"'
        else
            # Fallback to basic formatting without jq
            echo -e "${BLUE}Raw trade data:${NC} $message"
            echo "Note: Install 'jq' for prettier JSON formatting"
        fi
        echo -e "${YELLOW}----------------------------------------${NC}"
    else
        # Print the raw JSON
        echo "$message"
    fi
done 