import requests
import random
import time
import concurrent.futures
from typing import List, Dict
from tqdm import tqdm
import matplotlib.pyplot as plt
import numpy as np

BASE_URL = "https://panomarket.evan-phibbs.workers.dev"

# Test users and their initial balances
USERS = [f"user_{i}" for i in range(10)]
BASE = "USD"
QUOTE = "ETC"
INITIAL_BALANCES = {
    BASE: (5000000, 10000000),  # Random balance between 5000-10000 USD
    QUOTE: (5000000, 10000000)      # Random balance between 0.5-2.0 BTC
}

def setup_user_balances():
    """Initialize balances for all test users"""
    balances = {}
    for user_id in USERS:
        balances[user_id] = {
            BASE: round(random.uniform(*INITIAL_BALANCES[BASE]), 2),
            QUOTE: round(random.uniform(*INITIAL_BALANCES[QUOTE]), 8)
        }
        
        # Add USD balance
        response = requests.post(
            f"{BASE_URL}/balances/{user_id}",
            json={"asset": BASE, "amount": balances[user_id][BASE]}
        )
        
        if response.status_code != 200:
            print(f"Error adding {BASE} balance to {user_id}: {response.status_code}")
            print(response.text)
        
        # Add BTC balance
        response = requests.post(
            f"{BASE_URL}/balances/{user_id}",
            json={"asset": QUOTE, "amount": balances[user_id][QUOTE]}
        )
        
        if response.status_code != 200:
            print(f"Error adding {QUOTE} balance to {user_id}: {response.status_code}")
            print(response.text)
    
    return balances

def generate_order(user_id: str, balances: Dict):
    """Generate a random buy or sell order for BASE/QUOTE"""
    is_buy = random.choice([True, False])
    current_price = 10  # Simulated current BTC price
    price_variance = random.uniform(0.95, 1.05)  # ±5% price variance
    
    if is_buy:
        max_usd = balances[user_id][BASE]
        
        price = current_price * price_variance
        max_btc = max_usd / price
        amount = round(random.uniform(0.001, 1), 8)
        
        return {
            "market": f"{BASE}:{QUOTE}",
            "user_id": user_id,
            "side": "buy",
            "price": round(price, 2),
            "quantity": amount
        }
    else:
        max_btc = balances[user_id][QUOTE]
            
        price = current_price * price_variance
        amount = round(random.uniform(0.001, 1), 8)
        
        return {
            "market": f"{BASE}:{QUOTE}",
            "user_id": user_id,
            "side": "sell",
            "price": round(price, 2),
            "quantity": amount
        }
        
def submit_order(order):
    """Submit an order to the exchange"""
    if order is None:
        return
    
    try:
        start_time = time.time()
        response = requests.post(f"{BASE_URL}/markets/{order['market']}/orders", json=order)
        elapsed = time.time() - start_time
        result = response.json()
        return {"response": result, "code": response.status_code, "elapsed": elapsed}
    except Exception as e:
        print(f"Error submitting order: {e}")
        return None

def create_market():
    """Create the USD:BTC market if it doesn't exist"""
    try:
        response = requests.post(
            f"{BASE_URL}/markets-manage",
            json={
                "buy_asset": BASE,
                "sell_asset": QUOTE
            }
        )
        if response.status_code == 200:
            print(f"Market {BASE}:{QUOTE} created successfully")
        elif response.status_code == 409:
            print(f"Market {BASE}:{QUOTE} already exists")
        else:
            print(f"Error creating market: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"Error creating market: {e}")

def run_simulation(concurrent_orders: int, duration_seconds: int):
    """Run the market simulation with specified number of concurrent orders"""
    print(f"\nRunning simulation with {concurrent_orders} concurrent orders...")
    print("Creating market...")
    create_market()
    
    print("Setting up user balances...")
    balances = setup_user_balances()
    
    print(f"Starting simulation: {concurrent_orders} concurrent orders for {duration_seconds} seconds")
    end_time = time.time() + duration_seconds
    
    # Track timing statistics
    request_times = []
    orders_submitted = 0
    trades_occurred = 0
    global_start_time = time.time()
    code_counts = {}
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrent_orders) as executor:
        with tqdm(desc="Orders submitted", unit=' orders') as pbar:
            # Initial batch of futures
            futures = set()
            while time.time() < end_time:
                # Fill up to concurrent_orders
                while len(futures) < concurrent_orders:
                    order = generate_order(random.choice(USERS), balances)
                    if order:
                        futures.add(executor.submit(submit_order, order))
                
                # Wait for at least one order to complete
                done, futures = concurrent.futures.wait(
                    futures, 
                    return_when=concurrent.futures.FIRST_COMPLETED
                )
                
                # Process completed orders
                for future in done:
                    result = future.result()
                    if result and "elapsed" in result:
                        request_times.append(result["elapsed"])
                        if result["code"] in code_counts:
                            code_counts[result["code"]] += 1
                        else:
                            code_counts[result["code"]] = 1
                        orders_submitted += 1
                        trades_occurred += len(result["response"]["trades"])
                        pbar.update(1)
                        global_stop_time = time.time()
                
                # Update progress bar
                pbar.set_postfix({'Orders': orders_submitted, 'Trades': trades_occurred, '400': code_counts.get(400, 0), '200': code_counts.get(200, 0)}, refresh=True)
    
    # Calculate orders per second
    total_time = global_stop_time - global_start_time
    
    # Calculate statistics
    stats = {
        'concurrent_orders': concurrent_orders,
        'avg_time': sum(request_times) / len(request_times) if request_times else 0,
        'max_time': max(request_times) if request_times else 0,
        'min_time': min(request_times) if request_times else 0,
        'orders_per_second': orders_submitted / total_time if total_time > 0 else 0,
        'total_orders': orders_submitted,
        'total_time': total_time,
        'total_trades': trades_occurred,
        'success_rate': code_counts.get(200, 0) / orders_submitted if orders_submitted > 0 else 0
    }
    
    print(f"\nPerformance Statistics for {concurrent_orders} concurrent orders:")
    print(f"Total time: {total_time:.3f} seconds")
    print(f"Average request time: {stats['avg_time']:.3f} seconds")
    print(f"Maximum request time: {stats['max_time']:.3f} seconds")
    print(f"Minimum request time: {stats['min_time']:.3f} seconds")
    print(f"Total orders submitted: {stats['total_orders']}")
    print(f"Total trades occurred: {stats['total_trades']}")
    print(f"Average orders/second: {stats['orders_per_second']:.1f}")
    print(f"Success rate: {stats['success_rate']*100:.1f}%")
    
    return stats

if __name__ == "__main__":
    # Test different concurrent order counts
    concurrent_orders_tests = [1, 10, 100, 1000]
    duration_seconds = 10
    results = []
    
    for concurrent_orders in concurrent_orders_tests:
        stats = run_simulation(concurrent_orders=concurrent_orders, duration_seconds=duration_seconds)
        results.append(stats)
    
    # Create the latency graph
    plt.figure(figsize=(10, 6))
    x = np.arange(len(concurrent_orders_tests))
    width = 0.25
    
    plt.bar(x - width, [r['min_time'] for r in results], width, label='Min Latency')
    plt.bar(x, [r['avg_time'] for r in results], width, label='Avg Latency')
    plt.bar(x + width, [r['max_time'] for r in results], width, label='Max Latency')
    
    plt.xlabel('Concurrent Orders')
    plt.ylabel('Latency (seconds)')
    plt.title('Order Latency vs Concurrent Orders')
    plt.xticks(x, concurrent_orders_tests)
    plt.legend()
    plt.grid(True, alpha=0.3)
    
    # Add a second y-axis for orders and trades per second
    ax2 = plt.twinx()
    ax2.plot(x, [r['orders_per_second'] for r in results], 'r--', label='Orders/sec')
    ax2.plot(x, [r['total_trades'] / r['total_time'] for r in results], 'g--', label='Trades/sec')
    ax2.set_ylabel('Orders/Trades per Second')
    ax2.legend(loc='lower right')
    
    plt.tight_layout()
    plt.savefig('latency_analysis.png')
    plt.close()
    
    print("\nAnalysis complete! Results saved to latency_analysis.png")
