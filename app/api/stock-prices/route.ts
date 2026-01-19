import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

// Fetch current stock prices from Alpha Vantage API
// You can also use other APIs like Yahoo Finance, IEX Cloud, etc.
export async function POST(request: Request) {
  try {
    console.log("Stock prices API called")

    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { symbols } = await request.json()

    console.log("=== STOCK PRICES API CALLED ===")
    console.log("Request received with symbols:", symbols)

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      console.log("ERROR: Invalid symbols array")
      return NextResponse.json(
        { error: "Symbols array is required" },
        { status: 400 }
      )
    }

    // Get API key from environment variable
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY || process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY
    
    console.log("API Key Status:", apiKey ? `Found (${apiKey.substring(0, 4)}...)` : "NOT FOUND")
    console.log("Will use:", apiKey ? "Alpha Vantage (with Yahoo Finance fallback)" : "Yahoo Finance only")

    if (!apiKey) {
      // Use multiple free APIs as fallbacks
      const prices: Record<string, number> = {}
      
      // Fetch prices with multiple fallback methods
      for (const symbol of symbols) {
        try {
          // Clean the symbol (remove spaces, convert to uppercase)
          const cleanSymbol = symbol.trim().toUpperCase()
          let price = 0
          
           // Method 1: Try Yahoo Finance v8 API
           // For Australian stocks, try with .AX suffix first, then without
           const symbolsToTry = []
           // Check if it might be an Australian stock (common ASX tickers)
           if (!cleanSymbol.includes('.') && cleanSymbol.length <= 4) {
             symbolsToTry.push(`${cleanSymbol}.AX`) // Try with .AX suffix for ASX
           }
           symbolsToTry.push(cleanSymbol) // Also try original symbol
           
           for (const symbolToTry of symbolsToTry) {
             try {
               console.log(`  → Trying Yahoo Finance v8 API with symbol: ${symbolToTry}`)
               const yahooResponse = await fetch(
                 `https://query1.finance.yahoo.com/v8/finance/chart/${symbolToTry}?interval=1d&range=1d`,
                 {
                   headers: {
                     'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                     'Accept': 'application/json',
                   },
                   next: { revalidate: 60 } // Cache for 60 seconds
                 }
               )

               console.log(`  → Yahoo Finance Response Status: ${yahooResponse.status} ${yahooResponse.statusText}`)
               
               if (yahooResponse.ok) {
                 const data = await yahooResponse.json()
                 console.log(`  → Yahoo Finance Response Data (first 500 chars):`, JSON.stringify(data).substring(0, 500))
                 
                 // Try multiple paths in the response
                 if (data.chart?.result?.[0]?.meta?.regularMarketPrice) {
                   price = data.chart.result[0].meta.regularMarketPrice
                   console.log(`  → Found price in regularMarketPrice: $${price}`)
                 } else if (data.chart?.result?.[0]?.meta?.previousClose) {
                   price = data.chart.result[0].meta.previousClose
                   console.log(`  → Found price in previousClose: $${price}`)
                 } else if (data.chart?.result?.[0]?.indicators?.quote?.[0]?.close) {
                   const closes = data.chart.result[0].indicators.quote[0].close
                   const validCloses = closes.filter((p: number) => p && p > 0)
                   if (validCloses.length > 0) {
                     price = validCloses[validCloses.length - 1] // Get last valid close price
                     console.log(`  → Found price in indicators.quote.close: $${price}`)
                   }
                 }
                 
                 if (price > 0) {
                   console.log(`  ✅ Yahoo Finance SUCCESS: Found price for ${cleanSymbol} using symbol ${symbolToTry}: $${price}`)
                   prices[cleanSymbol] = price
                   break // Success, exit the symbolsToTry loop
                 } else {
                   console.log(`  ⚠️  Yahoo Finance: No valid price found for ${symbolToTry}`)
                 }
               } else {
                 console.log(`  ❌ Yahoo Finance HTTP Error for ${symbolToTry}: ${yahooResponse.status}`)
               }
             } catch (yahooError) {
               console.log(`  ❌ Yahoo Finance EXCEPTION for ${symbolToTry}:`, yahooError)
             }
           }
           
           if (price > 0) {
             continue // Success, move to next symbol
           }
          
           // Method 2: Try Yahoo Finance quote endpoint
           if (price === 0) {
             const quoteSymbolsToTry = []
             if (!cleanSymbol.includes('.') && cleanSymbol.length <= 4) {
               quoteSymbolsToTry.push(`${cleanSymbol}.AX`)
             }
             quoteSymbolsToTry.push(cleanSymbol)
             
             for (const symbolToTry of quoteSymbolsToTry) {
               try {
                 console.log(`  → Trying Yahoo Finance v7 quote API with symbol: ${symbolToTry}`)
                 const quoteResponse = await fetch(
                   `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbolToTry}`,
                   {
                     headers: {
                       'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                       'Accept': 'application/json',
                     },
                   }
                 )
                 
                 console.log(`  → Yahoo Quote Response Status: ${quoteResponse.status} ${quoteResponse.statusText}`)
              
                 if (quoteResponse.ok) {
                   const quoteData = await quoteResponse.json()
                   console.log(`  → Yahoo Quote Response Data (first 500 chars):`, JSON.stringify(quoteData).substring(0, 500))
                   
                   if (quoteData.quoteResponse?.result?.[0]?.regularMarketPrice) {
                     price = quoteData.quoteResponse.result[0].regularMarketPrice
                     console.log(`  → Found price in regularMarketPrice: $${price}`)
                   } else if (quoteData.quoteResponse?.result?.[0]?.price) {
                     price = quoteData.quoteResponse.result[0].price
                     console.log(`  → Found price in price field: $${price}`)
                   }
                   
                   if (price > 0) {
                     console.log(`  ✅ Yahoo Quote API SUCCESS: Found price for ${cleanSymbol} using symbol ${symbolToTry}: $${price}`)
                     prices[cleanSymbol] = price
                     break // Success, exit the quoteSymbolsToTry loop
                   } else {
                     console.log(`  ⚠️  Yahoo Quote API: No valid price found for ${symbolToTry}`)
                   }
                 } else {
                   console.log(`  ❌ Yahoo Quote HTTP Error for ${symbolToTry}: ${quoteResponse.status}`)
                 }
               } catch (quoteError) {
                 console.log(`  ❌ Yahoo Quote API EXCEPTION for ${symbolToTry}:`, quoteError)
               }
             }
             
             if (price > 0) {
               continue // Success, move to next symbol
             }
           }
          
          // Method 3: Try Finnhub (free tier, no key needed for basic quotes)
          if (price === 0) {
            try {
              const finnhubKey = process.env.FINNHUB_API_KEY
              if (finnhubKey) {
                const finnhubResponse = await fetch(
                  `https://finnhub.io/api/v1/quote?symbol=${cleanSymbol}&token=${finnhubKey}`,
                  {
                    headers: {
                      'Accept': 'application/json',
                    },
                  }
                )
                
                if (finnhubResponse.ok) {
                  const finnhubData = await finnhubResponse.json()
                  if (finnhubData.c && finnhubData.c > 0) {
                    price = finnhubData.c
                    console.log(`Finnhub: Found price for ${cleanSymbol}: ${price}`)
                    prices[cleanSymbol] = price
                    continue
                  }
                }
              }
            } catch (finnhubError) {
              console.log(`Finnhub failed for ${cleanSymbol}:`, finnhubError)
            }
          }
          
          // If all methods failed
          if (price === 0) {
            console.log(`All methods failed for ${cleanSymbol}. Symbol may be invalid or not found.`)
            prices[cleanSymbol] = 0
          }
          
        } catch (error) {
          console.error(`Error fetching price for ${symbol}:`, error)
          prices[symbol] = 0
        }
      }

      return NextResponse.json({ prices })
    }

    // If Alpha Vantage API key is available, use it (with Yahoo Finance as fallback)
    const prices: Record<string, number> = {}
    let useYahooFallback = false // Track if we hit rate limits
    
    console.log(`\n=== PROCESSING ${symbols.length} SYMBOL(S) ===`)
    
    // Alpha Vantage has rate limits (5 calls per minute for free tier)
    // Try Alpha Vantage first, fallback to Yahoo Finance if rate limited or fails
    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i]
      try {
        const cleanSymbol = symbol.trim().toUpperCase()
        let price = 0
        
        console.log(`\n[${i + 1}/${symbols.length}] Processing symbol: ${cleanSymbol}`)
        
        // Try Alpha Vantage first (unless we've hit rate limits)
        // Note: Alpha Vantage may not support ASX stocks well, so we'll try but fallback to Yahoo
        if (!useYahooFallback && apiKey) {
          console.log(`  → Attempting Alpha Vantage API for ${cleanSymbol}`)
          
          // Try both formats for Australian stocks (ASX.AX and just ASX)
          const avSymbolsToTry = []
          if (!cleanSymbol.includes('.')) {
            // Try with .AX suffix for ASX stocks
            avSymbolsToTry.push(`${cleanSymbol}.AX`)
          }
          avSymbolsToTry.push(cleanSymbol) // Also try original symbol
          
          for (const avSymbol of avSymbolsToTry) {
            try {
              const avUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${avSymbol}&apikey=${apiKey.substring(0, 4)}...`
              console.log(`  → API URL: ${avUrl}`)
              
              const response = await fetch(
                `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${avSymbol}&apikey=${apiKey}`,
                {
                  next: { revalidate: 60 } // Cache for 60 seconds
                }
              )

              console.log(`  → Alpha Vantage Response Status: ${response.status} ${response.statusText}`)

              if (response.ok) {
                const data = await response.json()
                console.log(`  → Alpha Vantage Response Data:`, JSON.stringify(data).substring(0, 300))
                
                // Check for API errors
                if (data['Error Message']) {
                  console.log(`  ❌ Alpha Vantage ERROR for ${avSymbol}:`, data['Error Message'])
                } else if (data['Note']) {
                  // Rate limit hit - switch to Yahoo Finance for remaining symbols
                  console.log(`  ⚠️  Alpha Vantage RATE LIMIT HIT:`, data['Note'])
                  console.log(`  → Switching to Yahoo Finance fallback for remaining symbols`)
                  useYahooFallback = true
                  break // Exit the avSymbolsToTry loop
                } else if (data['Global Quote'] && data['Global Quote']['05. price']) {
                  price = parseFloat(data['Global Quote']['05. price'])
                  if (price > 0) {
                    console.log(`  ✅ Alpha Vantage SUCCESS: Found price for ${cleanSymbol} using symbol ${avSymbol} = $${price}`)
                    prices[cleanSymbol] = price
                    break // Success, exit the avSymbolsToTry loop
                  } else {
                    console.log(`  ⚠️  Alpha Vantage: Price is 0 or invalid for ${avSymbol}`)
                  }
                } else if (data['Global Quote'] && Object.keys(data['Global Quote']).length === 0) {
                  console.log(`  ⚠️  Alpha Vantage: Empty Global Quote for ${avSymbol} (symbol may be invalid)`)
                } else {
                  console.log(`  ⚠️  Alpha Vantage: Unexpected response structure for ${avSymbol}`)
                }
              } else {
                console.log(`  ❌ Alpha Vantage HTTP Error for ${avSymbol}: ${response.status}`)
              }
            } catch (avError) {
              console.log(`  ❌ Alpha Vantage EXCEPTION for ${avSymbol}:`, avError)
            }
          }
          
          if (price > 0) {
            continue // Success, move to next symbol
          }
        } else if (useYahooFallback) {
          console.log(`  → Skipping Alpha Vantage (rate limit hit, using Yahoo Finance)`)
        } else if (!apiKey) {
          console.log(`  → Skipping Alpha Vantage (no API key available)`)
        }
        
        // Fallback to Yahoo Finance if Alpha Vantage failed or rate limited
        if (price === 0 || useYahooFallback || !apiKey) {
          console.log(`  → Attempting Yahoo Finance API for ${cleanSymbol}`)
          
          // For Australian stocks, try with .AX suffix first, then without
          const yahooSymbolsToTry = []
          if (!cleanSymbol.includes('.') && cleanSymbol.length <= 4) {
            yahooSymbolsToTry.push(`${cleanSymbol}.AX`) // Try with .AX suffix for ASX
          }
          yahooSymbolsToTry.push(cleanSymbol) // Also try original symbol
          
          for (const symbolToTry of yahooSymbolsToTry) {
            try {
              const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbolToTry}?interval=1d&range=1d`
              console.log(`  → API URL: ${yahooUrl}`)
              
              const yahooResponse = await fetch(
                yahooUrl,
                {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json',
                  },
                }
              )

              console.log(`  → Yahoo Finance Response Status: ${yahooResponse.status} ${yahooResponse.statusText}`)

              if (yahooResponse.ok) {
                const data = await yahooResponse.json()
                console.log(`  → Yahoo Finance Response Data (first 500 chars):`, JSON.stringify(data).substring(0, 500))
                
                if (data.chart?.result?.[0]?.meta?.regularMarketPrice) {
                  price = data.chart.result[0].meta.regularMarketPrice
                  console.log(`  → Found price in regularMarketPrice: $${price}`)
                } else if (data.chart?.result?.[0]?.meta?.previousClose) {
                  price = data.chart.result[0].meta.previousClose
                  console.log(`  → Found price in previousClose: $${price}`)
                } else if (data.chart?.result?.[0]?.indicators?.quote?.[0]?.close) {
                  const closes = data.chart.result[0].indicators.quote[0].close
                  const validCloses = closes.filter((p: number) => p && p > 0)
                  if (validCloses.length > 0) {
                    price = validCloses[validCloses.length - 1]
                    console.log(`  → Found price in indicators.quote.close: $${price}`)
                  } else {
                    console.log(`  ⚠️  No valid close prices in indicators array`)
                  }
                } else {
                  console.log(`  ⚠️  Yahoo Finance: No price data found in response structure`)
                }
                
                if (price > 0) {
                  console.log(`  ✅ Yahoo Finance SUCCESS: Found price for ${cleanSymbol} using symbol ${symbolToTry} = $${price}`)
                  prices[cleanSymbol] = price
                  break // Success, exit the yahooSymbolsToTry loop
                } else {
                  console.log(`  ⚠️  Yahoo Finance: Could not extract valid price for ${symbolToTry}`)
                }
              } else {
                console.log(`  ❌ Yahoo Finance HTTP Error for ${symbolToTry}: ${yahooResponse.status}`)
              }
            } catch (yahooError) {
              console.log(`  ❌ Yahoo Finance EXCEPTION for ${symbolToTry}:`, yahooError)
            }
          }
          
          if (price > 0) {
            continue // Success, move to next symbol
          }
        }
        
        // If both failed
        if (price === 0) {
          console.log(`  ❌ FAILED: Both Alpha Vantage and Yahoo Finance returned 0 for ${cleanSymbol}`)
          prices[cleanSymbol] = 0
        }
        
      } catch (error) {
        console.error(`  ❌ EXCEPTION processing ${symbol}:`, error)
        prices[symbol] = 0
      }
    }

    console.log(`\n=== FINAL RESULTS ===`)
    console.log("Prices retrieved:", prices)
    const successCount = Object.values(prices).filter(p => p > 0).length
    const failCount = Object.values(prices).filter(p => p === 0).length
    console.log(`Success: ${successCount}, Failed: ${failCount}`)
    console.log("====================\n")

    return NextResponse.json({ prices })
  } catch (error) {
    console.error("Error fetching stock prices:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
