package com.acebank.lite.controllers;

import com.acebank.lite.models.Transaction;
import com.acebank.lite.service.BankService;
import com.acebank.lite.service.BankServiceImpl;
import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.java.Log;

import java.io.IOException;
import java.io.PrintWriter;
import java.util.List;

@Log
@WebServlet("/api/transactions")
public class ApiTransactions extends HttpServlet {

    private final BankService bankService = new BankServiceImpl();
    private final Gson gson = new Gson();

    @Override
    protected void doOptions(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        setCorsHeaders(resp);
        resp.setStatus(HttpServletResponse.SC_OK);
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        setCorsHeaders(resp);
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");
        PrintWriter out = resp.getWriter();
        JsonObject responseJson = new JsonObject();

        try {
            String accParam = req.getParameter("accountNo");
            if (accParam == null || accParam.isEmpty()) {
                responseJson.addProperty("success", false);
                responseJson.addProperty("message", "accountNo parameter is required");
                out.print(gson.toJson(responseJson));
                return;
            }

            int accountNo = Integer.parseInt(accParam);

            // Use existing service to fetch transaction history
            List<Transaction> transactions = bankService.getTransactionHistory(accountNo);

            responseJson.addProperty("success", true);
            JsonArray txArray = new JsonArray();

            for (Transaction tx : transactions) {
                JsonObject txObj = new JsonObject();
                txObj.addProperty("id", tx.id());
                txObj.addProperty("senderAccount", tx.senderAccount());
                txObj.addProperty("receiverAccount", tx.receiverAccount());
                txObj.addProperty("amount", tx.amount());
                txObj.addProperty("txType", tx.txType());
                txObj.addProperty("remark", tx.remark());
                txObj.addProperty("createdAt", tx.createdAt() != null ? tx.createdAt().toString() : "");

                // Determine if this is incoming or outgoing for the requesting account
                boolean isOutgoing = tx.senderAccount() == accountNo && !"DEPOSIT".equals(tx.txType());
                txObj.addProperty("direction", isOutgoing ? "outgoing" : "incoming");

                txArray.add(txObj);
            }

            responseJson.add("transactions", txArray);

        } catch (NumberFormatException e) {
            responseJson.addProperty("success", false);
            responseJson.addProperty("message", "Invalid account number");
        } catch (Exception e) {
            log.severe("Transactions API error: " + e.getMessage());
            responseJson.addProperty("success", false);
            responseJson.addProperty("message", "Server error: " + e.getMessage());
        }

        out.print(gson.toJson(responseJson));
        out.flush();
    }

    private void setCorsHeaders(HttpServletResponse response) {
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    }
}
