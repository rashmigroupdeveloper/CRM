import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // adjust import based on your project
import { otpTemplate } from "../email.template";
import { emailService } from "@/lib/emailService";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body?.email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    // Check if temp registration exists
    const tempRegistration = await prisma.tempRegistrations.findFirst({
      where: { email: body.email },
    });

    if (!tempRegistration) {
      return NextResponse.json(
        { error: "No pending verification found for this email. Please start signup again." },
        { status: 400 }
      );
    }

    // Check if temp registration has expired
    if (tempRegistration.expiresAt < new Date()) {
      await prisma.tempRegistrations.deleteMany({
        where: { email: body.email },
      });
      return NextResponse.json(
        { error: "Verification session expired. Please start signup again." },
        { status: 400 }
      );
    }

    // Generate new OTP
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit

    // Update the existing temp registration with new OTP
    await prisma.tempRegistrations.update({
      where: { id: tempRegistration.id }, // assuming there's an id field
      data: {
        otp: newOtp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // reset expiry to 10 minutes from now
      },
    });

    // Send OTP email via centralized email service
    await emailService.sendEmail({
      to: body.email,
      subject: "Verify your email",
      html: otpTemplate(parseInt(newOtp))
    });

    return NextResponse.json({ message: "New OTP sent to your email." });
  } catch (error: unknown) {
    // Log error for debugging
    console.error("Error in OTP resend:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      {
        error: "Something went wrong. Please try again later.",
        details:
          process.env.NODE_ENV === "development" ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
