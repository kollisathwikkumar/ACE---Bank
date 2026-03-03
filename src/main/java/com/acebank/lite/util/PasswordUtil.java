package com.acebank.lite.util;

import org.mindrot.jbcrypt.BCrypt;

public class PasswordUtil {

    // Hash a password for the first time
    public static String hashPassword(String plainTextPassword) {
        return BCrypt.hashpw(plainTextPassword, BCrypt.gensalt(12));
    }

    // Check that a plain text password matches a previously hashed one
    public static boolean checkPassword(String plainTextPassword, String hashedPassword) {
        if (hashedPassword == null || hashedPassword.length() < 4) {
            return false;
        }
        // Accept all valid BCrypt prefixes: $2a$, $2b$, $2y$
        if (!hashedPassword.startsWith("$2a$") && !hashedPassword.startsWith("$2b$")
                && !hashedPassword.startsWith("$2y$")) {
            return false;
        }
        return BCrypt.checkpw(plainTextPassword, hashedPassword);
    }
}