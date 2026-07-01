const TransactionModel = require("../models/transactionModel");
const db = require("../services/db");
const {
  validateCheckOut,
  validateDisposal,
  sanitizeString,
  sanitizeTitleCase,
  sanitizeQuantity,
  sanitizeContactNumber,
} = require("../utils/validation");

const TransactionController = {
  // GET /api/transactions/:id
  // Retrieve single transaction by ID
  async getById(req, res) {
    try {
      const { id } = req.params;
      const transaction = await TransactionModel.getById(id);

      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      res.json(transaction);
    } catch (error) {
      console.error("Get transaction error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // GET /api/transactions
  // Retrieve all transactions with optional filtering by seed, type, crop, date range
  async getAll(req, res) {
    try {
      const {
        seed_id,
        seed_lot_id,
        transaction_type,
        type,
        crop_type,
        variety,
        start_date,
        end_date,
      } = req.query;

      const transactions = await TransactionModel.getAll({
        seed_id: seed_id || seed_lot_id,
        transaction_type,
        type,
        crop_type,
        variety,
        start_date,
        end_date,
        userRole: req.user?.role,
        userId: req.user?.userId,
      });

      res.json(transactions);
    } catch (error) {
      console.error("Get transactions error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // GET /api/seeds/:id/transactions
  // Get all transactions for a specific seed with role-based access control
  async getBySeedId(req, res) {
    try {
      const { id } = req.params;
      const transactions = await TransactionModel.getBySeedId(
        id,
        req.user?.role,
        req.user?.userId,
      );
      res.json(transactions);
    } catch (error) {
      console.error("Get seed transactions error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // POST /api/transactions/checkout
  // Create seed checkout transaction with recipient and purpose information
  async checkOut(req, res) {
    try {
      const {
        seed_id: seedIdFromBody,
        seed_lot_id: seedLotIdFromBody,
        quantity,
        recipient,
        purpose,
        affiliation,
        contact,
        remarks,
      } = req.body;
      const seed_id = seedIdFromBody || seedLotIdFromBody;
      const payload = {
        seed_id,
        quantity: sanitizeQuantity(quantity),
        recipient: sanitizeTitleCase(recipient),
        purpose: sanitizeTitleCase(purpose),
        affiliation: sanitizeTitleCase(affiliation),
        contact: sanitizeContactNumber(contact),
        remarks: sanitizeString(remarks),
      };

      const validation = validateCheckOut(payload);
      if (!validation.isValid) {
        return res.status(400).json({ error: validation.errors.join(", ") });
      }

      const transaction = await TransactionModel.checkOut(
        payload.seed_id,
        req.user.userId,
        payload.quantity,
        payload.recipient,
        payload.purpose,
        payload.affiliation,
        payload.contact,
        payload.remarks,
      );

      res.status(201).json(transaction);
    } catch (error) {
      console.error("Checkout error:", error);
      if (error.message === "Insufficient stock") {
        return res.status(400).json({ error: "Insufficient stock available" });
      }
      if (error.message === "Seed lot not found") {
        return res.status(404).json({ error: "Seed lot not found" });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Note: Check-in transactions removed - use gross_weight for initial seed quantity

  // POST /api/transactions/disposal
  async dispose(req, res) {
    try {
      const {
        seed_id: seedIdFromBody,
        seed_lot_id: seedLotIdFromBody,
        quantity,
        purpose,
        remarks,
      } = req.body;
      const seed_id = seedIdFromBody || seedLotIdFromBody;
      const payload = {
        seed_id,
        quantity: sanitizeQuantity(quantity),
        purpose: sanitizeTitleCase(purpose),
        remarks: sanitizeString(remarks),
      };

      const validation = validateDisposal(payload);
      if (!validation.isValid) {
        return res.status(400).json({ error: validation.errors.join(", ") });
      }

      const transaction = await TransactionModel.dispose(
        payload.seed_id,
        req.user.userId,
        payload.quantity,
        payload.purpose,
        payload.remarks,
      );

      res.status(201).json(transaction);
    } catch (error) {
      console.error("Disposal error:", error);
      if (error.message === "Cannot dispose more than available") {
        return res
          .status(400)
          .json({ error: "Cannot dispose more than available stock" });
      }
      if (error.message === "Seed lot not found") {
        return res.status(404).json({ error: "Seed lot not found" });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // PUT /api/transactions/:id
  async update(req, res) {
    try {
      const { id } = req.params;

      const payload = {
        recipient: sanitizeTitleCase(req.body.recipient),
        purpose: sanitizeTitleCase(req.body.purpose),
        affiliation: sanitizeTitleCase(req.body.affiliation),
        contact: sanitizeContactNumber(req.body.contact),
        remarks: sanitizeString(req.body.remarks),
      };

      const existing = await TransactionModel.getById(id);
      if (!existing) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      if (existing.transaction_type === "outgoing" && !payload.recipient) {
        return res.status(400).json({ error: "Recipient is required" });
      }

      if (existing.transaction_type === "disposal" && !payload.purpose) {
        return res.status(400).json({ error: "Purpose is required" });
      }

      const updated = await TransactionModel.update(id, payload);
      res.json(updated);
    } catch (error) {
      console.error("Update transaction error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // GET /api/transactions/recent
  // Returns the 10 most recent transactions; supports optional ?crop_group filter
  async getRecent(req, res) {
    try {
      const { crop_group } = req.query;
      const transactions = await TransactionModel.getAll({
        crop_type: undefined,
        type: undefined,
        userRole: req.user?.role,
        userId: req.user?.userId,
      });

      const limited = transactions.slice(0, 10);

      const result = limited.map((t) => ({
        type: t.transaction_type || t.type,
        seed_lot: t.batch_name || t.seed_id || t.seed_lot_id,
        quantity: t.quantity,
        date: t.created_at
          ? new Date(t.created_at).toISOString().slice(0, 10)
          : null,
        user:
          t.user_name ||
          (t.first_name && t.last_name
            ? `${t.first_name} ${t.last_name}`
            : null) ||
          "Unknown User",
        crop_group: t.crop_type || null,
      }));

      // Optional client-provided crop_group filter
      const filtered = crop_group
        ? result.filter(
            (r) =>
              (r.crop_group || "").toLowerCase() === crop_group.toLowerCase(),
          )
        : result;

      res.json(filtered);
    } catch (error) {
      console.error("Get recent transactions error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // DELETE /api/transactions/:id
  async delete(req, res) {
    try {
      const { id } = req.params;
      const deleted = await TransactionModel.delete(id);

      if (!deleted) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      res.json({ message: "Transaction deleted successfully" });
    } catch (error) {
      console.error("Delete transaction error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // GET /api/transactions/export/excel
  // Export all transactions with applied filters as Excel file
  async exportExcel(req, res) {
    try {
      const {
        seed_id,
        seed_lot_id,
        transaction_type,
        type,
        crop_type,
        variety,
        start_date,
        end_date,
      } = req.query;

      const transactions = await TransactionModel.getAll({
        seed_id: seed_id || seed_lot_id,
        transaction_type,
        type,
        crop_type,
        variety,
        start_date,
        end_date,
        userRole: req.user?.role,
        userId: req.user?.userId,
      });

      const XLSX = require("xlsx");
      const data = transactions.map(tx => ({
        "Transaction ID": tx.transaction_id,
        "Seed Lot": tx.batch_name || tx.seed_id,
        "Crop Type": tx.crop_type || "",
        "Variety": tx.variety || "",
        "Transaction Type": tx.transaction_type,
        "Quantity (kg)": parseFloat(tx.quantity),
        "Balance After (kg)": parseFloat(tx.balance_after),
        "Recipient": tx.recipient || "",
        "Purpose": tx.purpose || "",
        "Affiliation": tx.affiliation || "",
        "Contact": tx.contact || "",
        "Remarks": tx.remarks || "",
        "Logged By": tx.first_name && tx.last_name ? `${tx.first_name} ${tx.last_name}` : "Unknown",
        "Date": tx.created_at ? new Date(tx.created_at).toISOString().split('T')[0] : "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");

      const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=transactions_${Date.now()}.xlsx`);
      res.send(buffer);
    } catch (error) {
      console.error("Export transactions error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // POST /api/transactions/import/excel
  // Import transactions from Excel file
  async importExcel(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const XLSX = require("xlsx");
      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      const transactionsToInsert = [];
      const validationErrors = [];

      for (const [index, row] of rows.entries()) {
        const rowNumber = index + 2;
        let hasRowError = false;

        const txData = {
          batch_name: row["Seed Lot"] ? String(row["Seed Lot"]).trim() : "",
          type: row["Transaction Type"] ? String(row["Transaction Type"]).toLowerCase().trim() : "",
          quantity: sanitizeQuantity(row["Quantity (kg)"]),
          recipient: sanitizeTitleCase(row["Recipient"]),
          purpose: sanitizeTitleCase(row["Purpose"]),
          affiliation: sanitizeTitleCase(row["Affiliation"]),
          contact: sanitizeContactNumber(row["Contact"]),
          remarks: sanitizeString(row["Remarks"]),
        };

        if (!txData.batch_name) {
          validationErrors.push(`Row ${rowNumber}: Seed Lot is required.`);
          continue;
        }

        // Query database to find seed lot ID and current stock
        const seedResult = await db.query(
          "SELECT seed_id, current_quantity FROM seed_lot WHERE batch_name = $1 AND is_active = true LIMIT 1",
          [txData.batch_name]
        );

        const seedLot = seedResult.rows[0];
        if (!seedLot) {
          validationErrors.push(`Row ${rowNumber}: Seed lot "${txData.batch_name}" not found or inactive.`);
          continue;
        }

        const seedId = seedLot.seed_id;
        const currentQuantity = parseFloat(seedLot.current_quantity);
        txData.seed_id = seedId;

        // Validation based on type
        if (txData.type === "outgoing" || txData.type === "check-out") {
          txData.type = "check-out";
          const validation = validateCheckOut({
            seed_id: seedId,
            quantity: txData.quantity,
            recipient: txData.recipient,
            purpose: txData.purpose,
            contact: txData.contact,
          });

          if (!validation.isValid) {
            validationErrors.push(`Row ${rowNumber}: ${validation.errors.join(", ")}`);
            hasRowError = true;
          }

          if (txData.quantity > currentQuantity) {
            validationErrors.push(`Row ${rowNumber}: Insufficient stock available. Current: ${currentQuantity}kg, Requested: ${txData.quantity}kg.`);
            hasRowError = true;
          }
        } else if (txData.type === "disposal") {
          const validation = validateDisposal({
            seed_id: seedId,
            quantity: txData.quantity,
            purpose: txData.purpose,
          });

          if (!validation.isValid) {
            validationErrors.push(`Row ${rowNumber}: ${validation.errors.join(", ")}`);
            hasRowError = true;
          }

          if (txData.quantity > currentQuantity) {
            validationErrors.push(`Row ${rowNumber}: Cannot dispose more than available stock. Current: ${currentQuantity}kg, Requested: ${txData.quantity}kg.`);
            hasRowError = true;
          }
        } else {
          validationErrors.push(`Row ${rowNumber}: Invalid Transaction Type "${txData.type}". Must be 'outgoing' or 'disposal'.`);
          hasRowError = true;
        }

        if (!hasRowError) {
          transactionsToInsert.push(txData);
        }
      }

      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: "Import rejected due to validation errors",
          details: validationErrors,
        });
      }

      // Execute insertions
      const insertedTransactions = [];
      for (const txData of transactionsToInsert) {
        if (txData.type === "check-out") {
          const newTx = await TransactionModel.checkOut(
            txData.seed_id,
            req.user.userId,
            txData.quantity,
            txData.recipient,
            txData.purpose,
            txData.affiliation,
            txData.contact,
            txData.remarks
          );
          insertedTransactions.push(newTx);
        } else if (txData.type === "disposal") {
          const newTx = await TransactionModel.dispose(
            txData.seed_id,
            req.user.userId,
            txData.quantity,
            txData.purpose,
            txData.remarks
          );
          insertedTransactions.push(newTx);
        }
      }

      res.json({
        message: `Successfully imported ${insertedTransactions.length} transactions.`,
        importedCount: insertedTransactions.length,
      });
    } catch (error) {
      console.error("Import transactions error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // GET /api/transactions/import/template
  // Download Excel template for importing transactions
  async downloadTemplate(req, res) {
    try {
      const XLSX = require("xlsx");

      const headers = [
        "Seed Lot",
        "Transaction Type",
        "Quantity (kg)",
        "Recipient",
        "Purpose",
        "Affiliation",
        "Contact",
        "Remarks"
      ];

      const sampleRow = [
        "2026-06-soybean-Tiwala 6",
        "outgoing",
        50.0,
        "Angela Banasihan",
        "Research Project distribution",
        "UPLB Institute of Plant Breeding",
        "09123456789",
        "Sample remarks text"
      ];

      const aoaData = [headers, sampleRow];
      const worksheet = XLSX.utils.aoa_to_sheet(aoaData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Transaction Import Template");

      const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=transaction_import_template.xlsx");
      res.send(buffer);
    } catch (error) {
      console.error("Download template error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
};

module.exports = TransactionController;
