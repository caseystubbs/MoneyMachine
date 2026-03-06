import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Papa from "papaparse";

type CsvRow = {
  date: string;
  amount: string;
  description: string;
  businessUnit: string;
  currency: string;
  monthKey: string;
};

const allowedBusinessUnits = ["PUBLISHING", "MEDIA", "COMBINED"] as const;
type AllowedBusinessUnit = (typeof allowedBusinessUnits)[number];

function normalizeBusinessUnit(value: string): AllowedBusinessUnit {
  const cleaned = value.trim().toUpperCase();

  if (cleaned === "FREEDOM_INCOME_OPTIONS" || cleaned === "FIO") {
    return "COMBINED";
  }

  if (allowedBusinessUnits.includes(cleaned as AllowedBusinessUnit)) {
    return cleaned as AllowedBusinessUnit;
  }

  return "COMBINED";
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    const text = await file.text();

    const parsed = Papa.parse<CsvRow>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });

    if (parsed.errors.length > 0) {
      return NextResponse.json(
        {
          error: "CSV parse error.",
          details: parsed.errors,
        },
        { status: 400 }
      );
    }

    const rows = parsed.data;

    if (!rows.length) {
      return NextResponse.json({ error: "CSV had no rows." }, { status: 400 });
    }

    const toInsert = rows.map((row, index) => {
      if (!row.date || !row.amount || !row.description || !row.monthKey) {
        throw new Error(`Row ${index + 2} is missing required fields.`);
      }

      const parsedDate = new Date(row.date);
      if (Number.isNaN(parsedDate.getTime())) {
        throw new Error(`Row ${index + 2} has invalid date: ${row.date}`);
      }

      const parsedAmount = Number(row.amount);
      if (Number.isNaN(parsedAmount)) {
        throw new Error(`Row ${index + 2} has invalid amount: ${row.amount}`);
      }

      const description = row.description.trim();

      let type: "INCOME" | "REFUND" | "FEE" | "EXPENSE";
      if (parsedAmount > 0) {
        type = "INCOME";
      } else {
        const lower = description.toLowerCase();
        if (lower.includes("fee")) {
          type = "FEE";
        } else if (lower.includes("refund")) {
          type = "REFUND";
        } else {
          type = "EXPENSE";
        }
      }

      return {
        date: parsedDate,
        amount: parsedAmount.toString(),
        description,
        vendor: description,
        currency: (row.currency || "USD").trim().toUpperCase(),
        monthKey: row.monthKey.trim(),
        businessUnit: normalizeBusinessUnit(row.businessUnit || "COMBINED"),
        type,
        source: "MANUAL" as const,
        raw: row,
      };
    });

    const result = await prisma.transaction.createMany({
      data: toInsert,
    });

    return NextResponse.json({
      success: true,
      inserted: result.count,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown upload error.",
      },
      { status: 500 }
    );
  }
}