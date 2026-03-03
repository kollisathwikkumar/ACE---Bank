package com.acebank.lite.util;

import org.apache.ibatis.jdbc.ScriptRunner;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.logging.Logger;

//@Log
public final class ConnectionManager {

    private static ThreadLocal<Connection> threadLocalConnection = new ThreadLocal<>();
    private static boolean isSchemaInitialized = false;
    static final Logger log = Logger.getLogger(ConnectionManager.class.getName());

    private ConnectionManager() {
    }

    public static Connection getConnection() throws SQLException {
        Connection connection = threadLocalConnection.get();
        // 1. Check if the connection is dead/null/stale
        if (connection == null || connection.isClosed() || !connection.isValid(2)) {
            connection = establishConnection();
            threadLocalConnection.set(connection);
        }

        // 2. Run the script ONLY ONCE on the very first successful connection
        if (connection != null && !isSchemaInitialized) {
            checkAndRunInitScript(connection);
        }

        return connection;
    }

    private static synchronized void checkAndRunInitScript(Connection connection) {
        if (!isSchemaInitialized) {
            String scriptPath = ConfigLoader.getProperty(ConfigKeys.DB_SCRIPT_PATH);
            if (scriptPath != null) {
                runInitScript(connection, scriptPath);
            }
            isSchemaInitialized = true; // Set flag so it never runs again
        }
    }

    private static Connection establishConnection() throws SQLException {
        try {
            String url = ConfigLoader.getProperty(ConfigKeys.DB_URL);
            String user = ConfigLoader.getProperty(ConfigKeys.DB_USER);
            String pass = ConfigLoader.getProperty(ConfigKeys.DB_PWD);
            String driverName = ConfigLoader.getProperty(ConfigKeys.DB_MYSQL_DRIVER);

            Class.forName(driverName);// VVI
            Connection conn = DriverManager.getConnection(url, user, pass);
            log.info("Database connection established for thread " + Thread.currentThread().getName());
            return conn;
        } catch (Exception e) {
            log.severe("Database Connection Failed: " + e.getMessage());
            throw new SQLException("Failed to establish connection", e);
        }
    }

    private static void runInitScript(Connection connection, String path) {
        String normalizedPath = path.startsWith("/") ? path : "/" + path;
        try (InputStream is = ConnectionManager.class.getResourceAsStream(normalizedPath)) {
            if (is == null) {
                log.warning("Script not found at: " + normalizedPath);
                return;
            }
            ScriptRunner runner = new ScriptRunner(connection);
            runner.setLogWriter(null);
            runner.setStopOnError(false);
            runner.runScript(new BufferedReader(new InputStreamReader(is)));
            log.info("SQL Schema checked/initialized.");
        } catch (Exception e) {
            log.severe("SQL Init Error: " + e.getMessage());
        }
    }
}