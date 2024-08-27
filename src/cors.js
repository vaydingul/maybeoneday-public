import cors from "cors";
import rateLimit from "express-rate-limit";

function configureCORS(app) {
  // Tell Express to trust the proxy
  app.set("trust proxy", 1);

  if (process.env.NODE_ENV === "production") {
    // Define your allowed origins
    const allowedOrigins = [
      "https://maybe-one-day.com",
      "https://www.maybe-one-day.com",
      "http://localhost:3000",
    ];

    // Rate limiter
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: "Too many requests from this IP, please try again later.",
    });

    // Custom CORS middleware
    const customCorsMiddleware = (req, res, next) => {
      const origin = req.get("Origin");
      const referer = req.get("Referer");
      if (allowedOrigins.includes(origin) || allowedOrigins.includes(referer)) {
        res.header("Access-Control-Allow-Origin", origin);
        res.header(
          "Access-Control-Allow-Headers",
          "Origin, X-Requested-With, Content-Type, Accept"
        );
        res.header(
          "Access-Control-Allow-Methods",
          "GET, POST, PUT, DELETE, OPTIONS"
        );
        res.header("Access-Control-Allow-Credentials", "true");
      }
      next();
    };

    app.use(limiter);
    app.use(customCorsMiddleware);
  } else {
    app.use(cors());
  }
}

export { configureCORS };
