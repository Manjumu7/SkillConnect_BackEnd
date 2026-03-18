/**
 * Central error-handling middleware.
 * Must be registered AFTER all routes in app.js.
 */
const errorHandler = (err, req, res, _next) => {
    console.error("🔥 Unhandled error:", err);

    const statusCode = err.statusCode || 500;
    const message = statusCode === 500
        ? "Internal server error"
        : err.message || "Something went wrong";

    res.status(statusCode).json({
        success: false,
        message,
        // Only include stack trace in development
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
};

export default errorHandler;
