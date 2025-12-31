
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(
  value: number | undefined | null,
  options?: { maximumFractionDigits?: number }
) {
  if (value === null || value === undefined) {
    return "N/A";
  }

  try {
    const isNegative = value < 0;
    const absValue = Math.abs(value);

    // Determine the number of decimal places
    const maximumFractionDigits = options?.maximumFractionDigits;
    let decimalPlaces = 2; // Default
    if (typeof maximumFractionDigits === 'number') {
        decimalPlaces = maximumFractionDigits;
    } else {
        // If no option is passed, show 0 decimal places for whole numbers
        if (absValue % 1 === 0) {
            decimalPlaces = 0;
        }
    }
    
    const fixedString = absValue.toFixed(decimalPlaces);
    let [integerPart, decimalPart] = fixedString.split('.');
    
    // Apply Indian numbering system (crore, lakh)
    if (integerPart.length > 3) {
        const lastThreeDigits = integerPart.substring(integerPart.length - 3);
        const otherDigits = integerPart.substring(0, integerPart.length - 3);
        if (otherDigits !== '') {
            // Add commas every two digits for the remaining part
            const formattedOtherDigits = otherDigits.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
            integerPart = formattedOtherDigits + ',' + lastThreeDigits;
        }
    }

    let result = integerPart;
    if (decimalPart && decimalPlaces > 0) {
      result += '.' + decimalPart;
    }
    
    // Return only the formatted number without any currency symbol
    return `${isNegative ? '-' : ''}${result}`;

  } catch (error) {
    console.error("Currency formatting failed:", error);
    // Fallback to a simple representation if something goes wrong
    return `${value}`;
  }
}
