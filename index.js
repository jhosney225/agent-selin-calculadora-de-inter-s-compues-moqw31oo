
```javascript
const Anthropic = require("@anthropic-ai/sdk");
const readline = require("readline");

const client = new Anthropic();

// Calculator for compound interest
function calculateCompoundInterest(principal, rate, time, frequency) {
  const n = frequency;
  const amount = principal * Math.pow(1 + rate / 100 / n, n * time);
  const interest = amount - principal;
  return {
    principal: principal,
    rate: rate,
    time: time,
    frequency: frequency,
    finalAmount: Math.round(amount * 100) / 100,
    totalInterest: Math.round(interest * 100) / 100,
  };
}

// Generate investment projection over years
function generateProjection(principal, rate, years, frequency) {
  const projections = [];
  for (let year = 0; year <= years; year++) {
    const result = calculateCompoundInterest(principal, rate, year, frequency);
    projections.push({
      year: year,
      amount: result.finalAmount,
      interest: result.totalInterest,
    });
  }
  return projections;
}

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

// Main conversation loop with Claude
async function main() {
  const conversationHistory = [];
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("\n🏦 Compound Interest Investment Calculator");
  console.log("============================================");
  console.log(
    "Welcome! I'm your AI investment advisor. Ask me about compound interest calculations, investment strategies, or get help with your investment planning."
  );
  console.log("\nExamples of what you can ask:");
  console.log("- How much will $10,000 grow in 5 years at 7% interest?");
  console.log("- Compare different interest rates");
  console.log("- What's the best compounding frequency?");
  console.log("- Help me plan my retirement savings");
  console.log('\nType "quit" to exit\n');

  const systemPrompt = `You are an expert financial advisor specializing in compound interest calculations and investment strategies. 
You have access to calculation tools and can help users understand how their investments will grow over time.

When users ask about compound interest calculations, you should:
1. Extract the key parameters (principal, rate, time, compounding frequency)
2. Use the provided calculation functions to compute results
3. Provide clear, easy-to-understand explanations
4. Give actionable financial advice

Available calculation functions:
- calculateCompoundInterest(principal, rate, time, frequency): Returns final amount and interest earned
- generateProjection(principal, rate, years, frequency): Returns year-by-year growth projection
- formatCurrency(amount): Formats numbers as USD

Default compounding frequencies: 1=annual, 2=semi-annual, 4=quarterly, 12=monthly, 365=daily

Always be helpful, accurate, and encourage smart financial decision-making.`;

  async function chat(userMessage) {
    conversationHistory.push({
      role: "user",
      content: userMessage,
    });

    try {
      // Build context with calculations if relevant
      let calculationContext = "";

      // Check if the message contains numbers that might be investment parameters
      const numberPattern = /\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/g;
      const percentPattern = /(\d+(?:\.\d{1,2})?)\s*%/g;
      const yearPattern = /(\d+)\s*years?/i;

      const numbers = userMessage.match(numberPattern) || [];
      const percents = userMessage.match(percentPattern) || [];
      const years = userMessage.match(yearPattern) || [];

      // Provide calculation examples if numbers are detected
      if (numbers.length > 0 && percents.length > 0 && years.length > 0) {
        try {
          const principal = parseFloat(numbers[0].replace(/[$,]/g, ""));
          const rate = parseFloat(percents[0]);
          const time = parseInt(years[0]);

          const result = calculateCompoundInterest(principal, rate, time, 12); // Default monthly
          const projection = generateProjection(principal, rate, time, 12);

          calculationContext = `
Here are the calculation results for reference:
- Principal: ${formatCurrency(principal)}
- Annual Rate: ${rate}%
- Time Period: ${time} years
- Compounding: Monthly (12 times per year)
- Final Amount: ${formatCurrency(result.finalAmount)}
- Total Interest Earned: ${formatCurrency(result.totalInterest)}

5-Year Projection:
${projection
  .slice(0, Math.min(6, projection.length))
  .map(
    (p) =>
      `Year ${p.year}: ${formatCurrency(p.amount)} (Interest: ${formatCurrency(p.interest)})`
  )
  .join("\n")}`;
        } catch (e) {
          // Silently continue if calculation parsing fails
        }
      }

      const response = await client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        system:
          systemPrompt +
          (calculationContext
            ? `\n\nCurrent Calculation Context:\n${calculationContext}`
            : ""),
        messages: conversationHistory,
      });

      const assistantMessage =
        response.content[0].type === "text"
          ? response.content[0].text
          : "Unable to process response";

      conversationHistory.push({
        role: "assistant",
        content: assistantMessage,
      });

      return assistantMessage;
    } catch (error) {
      throw error;
    }
  }

  // Demo mode: Run some example calculations
  async function runDemo() {
    console.log("\