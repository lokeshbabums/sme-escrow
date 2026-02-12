"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Upload,
  User,
  FileText,
  Building2,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

type Step = "personal" | "documents" | "business" | "review";

const CLIENT_STEPS: Step[] = ["personal", "documents", "review"];
const VENDOR_STEPS: Step[] = [
  "personal",
  "documents",
  "business",
  "review",
];

const CLIENT_DOC_TYPES = ["Aadhaar", "PAN", "Passport"] as const;
const VENDOR_DOC_TYPES = [
  "Aadhaar",
  "PAN",
  "Passport",
  "GST Certificate",
] as const;

interface UserInfo {
  role: string;
  name: string | null;
  email: string;
  profile: {
    kycStatus: string;
    docType?: string | null;
    docNumber?: string | null;
    kycNotes?: string | null;
    bio?: string | null;
  } | null;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("personal");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");

  const [docType, setDocType] = useState("Aadhaar");
  const [docNumber, setDocNumber] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);

  const [businessName, setBusinessName] = useState("");
  const [serviceAreas, setServiceAreas] = useState("");
  const [experience, setExperience] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setUserInfo({
          role: data.user.role,
          name: data.user.name,
          email: data.user.email,
          profile: data.profile,
        });
        if (data.user.name) setFullName(data.user.name);
        if (data.profile?.docType) setDocType(data.profile.docType);
        if (data.profile?.docNumber) setDocNumber(data.profile.docNumber);
        if (data.profile?.bio) {
          try {
            const bio = JSON.parse(data.profile.bio);
            if (bio.phone) setPhone(bio.phone);
            if (bio.address) setAddress(bio.address);
            if (bio.city) setCity(bio.city);
            if (bio.pincode) setPincode(bio.pincode);
            if (bio.businessName) setBusinessName(bio.businessName);
            if (bio.serviceAreas) setServiceAreas(bio.serviceAreas);
            if (bio.experience) setExperience(bio.experience);
          } catch {}
        }
      }
      setLoading(false);
    })();
  }, []);

  if (loading)
    return (
      <div className="p-6 text-[hsl(var(--muted-foreground))]">Loading…</div>
    );
  if (!userInfo)
    return (
      <div className="p-6 text-[hsl(var(--destructive))]">Failed to load.</div>
    );

  if (userInfo.role === "ADMIN") {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">KYC Onboarding</h1>
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <p className="text-[hsl(var(--muted-foreground))] text-center">
              Admin accounts do not require KYC verification. Use the Admin panel to review user KYC submissions.
            </p>
            <Button onClick={() => router.push("/app/admin/users")}>Go to User Management</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isVendor = userInfo.role === "VENDOR";
  const steps = isVendor ? VENDOR_STEPS : CLIENT_STEPS;
  const currentIdx = steps.indexOf(step);
  const docTypes = isVendor ? VENDOR_DOC_TYPES : CLIENT_DOC_TYPES;
  const kycStatus = userInfo.profile?.kycStatus ?? "NOT_STARTED";

  if (kycStatus === "APPROVED") {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">KYC Onboarding</h1>
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-green-700">
              Verification Complete
            </h2>
            <p className="text-[hsl(var(--muted-foreground))] text-center max-w-md">
              Your KYC has been approved. You have full access to the platform.
            </p>
            <Button onClick={() => router.push("/app")}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (kycStatus === "PENDING") {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">KYC Onboarding</h1>
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-yellow-100">
              <FileText className="h-8 w-8 text-yellow-600" />
            </div>
            <h2 className="text-xl font-semibold text-yellow-700">
              Under Review
            </h2>
            <p className="text-[hsl(var(--muted-foreground))] text-center max-w-md">
              Your documents have been submitted and are being reviewed by our
              team. This usually takes 1-2 business days.
            </p>
            <div className="text-sm text-[hsl(var(--muted-foreground))]">
              Document: {userInfo.profile?.docType} •{" "}
              {userInfo.profile?.docNumber}
            </div>
            <Button variant="outline" onClick={() => router.push("/app")}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canProceed = () => {
    if (step === "personal")
      return (
        fullName.trim() &&
        phone.trim() &&
        address.trim() &&
        city.trim() &&
        pincode.trim()
      );
    if (step === "documents") return docType && docNumber.trim().length >= 4;
    if (step === "business") return businessName.trim();
    return true;
  };

  const handleNext = () => {
    if (currentIdx < steps.length - 1) setStep(steps[currentIdx + 1]);
  };
  const handleBack = () => {
    if (currentIdx > 0) setStep(steps[currentIdx - 1]);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fullName }),
      });

      const res = await fetch("/api/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docType: docType === "GST Certificate" ? "PAN" : docType,
          docNumber,
          phone,
          address,
          city,
          pincode,
          ...(isVendor ? { businessName, serviceAreas, experience } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Submission failed");
        setSubmitting(false);
        return;
      }
      window.location.reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
    setSubmitting(false);
  };

  const stepIcons = {
    personal: User,
    documents: FileText,
    business: Building2,
    review: CheckCircle,
  };
  const stepLabels = {
    personal: "Personal Info",
    documents: "Documents",
    business: "Business",
    review: "Review",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">KYC Onboarding</h1>
        <p className="text-[hsl(var(--muted-foreground))]">
          {isVendor
            ? "Complete your vendor verification to start accepting orders."
            : "Verify your identity to start placing laundry orders."}
        </p>
      </div>

      {kycStatus === "REJECTED" && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="font-medium text-red-700">
            Previous submission was rejected
          </div>
          {userInfo.profile?.kycNotes && (
            <p className="text-sm text-red-600 mt-1">
              Reason: {userInfo.profile.kycNotes}
            </p>
          )}
          <p className="text-sm text-red-600 mt-1">
            Please correct the issues and resubmit your documents.
          </p>
        </div>
      )}

      {/* Step Progress */}
      <div className="flex items-center gap-2 flex-wrap">
        {steps.map((s, i) => {
          const Icon = stepIcons[s];
          const isActive = i === currentIdx;
          const isDone = i < currentIdx;
          return (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && (
                <div
                  className={`h-0.5 w-8 ${isDone ? "bg-[hsl(var(--primary))]" : "bg-[hsl(var(--border))]"}`}
                />
              )}
              <button
                onClick={() => {
                  if (isDone) setStep(s);
                }}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  isActive
                    ? "bg-[hsl(var(--primary))] text-white"
                    : isDone
                      ? "bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]"
                      : "bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {stepLabels[s]}
              </button>
            </div>
          );
        })}
      </div>

      {/* Personal Info */}
      {step === "personal" && (
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>
              Your basic details for verification.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Full Name *</label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full legal name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Phone Number *</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Address *</label>
              <Textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">City *</label>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                />
              </div>
              <div>
                <label className="text-sm font-medium">PIN Code *</label>
                <Input
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="560001"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents */}
      {step === "documents" && (
        <Card>
          <CardHeader>
            <CardTitle>Identity Documents</CardTitle>
            <CardDescription>
              Upload a government-issued ID for verification.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Document Type *</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {docTypes.map((dt) => (
                  <Button
                    key={dt}
                    variant={docType === dt ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDocType(dt)}
                  >
                    {dt}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Document Number *</label>
              <Input
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                placeholder={
                  docType === "Aadhaar"
                    ? "XXXX XXXX XXXX"
                    : docType === "PAN"
                      ? "ABCDE1234F"
                      : docType === "GST Certificate"
                        ? "22AAAAA0000A1Z5"
                        : "A1234567"
                }
              />
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                {docType === "Aadhaar"
                  ? "12-digit Aadhaar number"
                  : docType === "PAN"
                    ? "10-character PAN number"
                    : docType === "GST Certificate"
                      ? "15-digit GSTIN"
                      : "Passport number"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">
                Upload Document (optional)
              </label>
              <div className="mt-2">
                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed p-6 hover:bg-[hsl(var(--accent))] transition">
                  <Upload className="h-8 w-8 text-[hsl(var(--muted-foreground))]" />
                  <div>
                    <div className="text-sm font-medium">
                      {docFile ? docFile.name : "Click to upload"}
                    </div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">
                      {docFile
                        ? `${(docFile.size / 1024).toFixed(0)} KB`
                        : "PDF, JPG, PNG up to 5MB"}
                    </div>
                  </div>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) =>
                      setDocFile(e.target.files?.[0] ?? null)
                    }
                  />
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Business (vendor only) */}
      {step === "business" && isVendor && (
        <Card>
          <CardHeader>
            <CardTitle>Business Details</CardTitle>
            <CardDescription>
              Tell us about your laundry service business.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                Business / Shop Name *
              </label>
              <Input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Fresh & Clean Laundry"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Service Areas</label>
              <Textarea
                value={serviceAreas}
                onChange={(e) => setServiceAreas(e.target.value)}
                placeholder="Areas you service (e.g. Koramangala, Indiranagar, HSR Layout)"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Experience</label>
              <Textarea
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder="Briefly describe your experience in laundry services"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review */}
      {step === "review" && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Submit</CardTitle>
            <CardDescription>
              Please review your details before submitting.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border p-4 space-y-3">
              <div className="text-sm font-semibold text-[hsl(var(--primary))]">
                Personal Information
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-[hsl(var(--muted-foreground))]">
                    Name:
                  </span>{" "}
                  {fullName}
                </div>
                <div>
                  <span className="text-[hsl(var(--muted-foreground))]">
                    Phone:
                  </span>{" "}
                  {phone}
                </div>
                <div>
                  <span className="text-[hsl(var(--muted-foreground))]">
                    City:
                  </span>{" "}
                  {city}
                </div>
                <div>
                  <span className="text-[hsl(var(--muted-foreground))]">
                    PIN:
                  </span>{" "}
                  {pincode}
                </div>
              </div>
              <div className="text-sm">
                <span className="text-[hsl(var(--muted-foreground))]">
                  Address:
                </span>{" "}
                {address}
              </div>
            </div>

            <div className="rounded-2xl border p-4 space-y-3">
              <div className="text-sm font-semibold text-[hsl(var(--primary))]">
                Identity Document
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-[hsl(var(--muted-foreground))]">
                    Type:
                  </span>{" "}
                  {docType}
                </div>
                <div>
                  <span className="text-[hsl(var(--muted-foreground))]">
                    Number:
                  </span>{" "}
                  {docNumber}
                </div>
              </div>
              {docFile && (
                <div className="text-sm">
                  <span className="text-[hsl(var(--muted-foreground))]">
                    File:
                  </span>{" "}
                  {docFile.name} ({(docFile.size / 1024).toFixed(0)} KB)
                </div>
              )}
            </div>

            {isVendor && (
              <div className="rounded-2xl border p-4 space-y-3">
                <div className="text-sm font-semibold text-[hsl(var(--primary))]">
                  Business Details
                </div>
                <div className="text-sm">
                  <span className="text-[hsl(var(--muted-foreground))]">
                    Business Name:
                  </span>{" "}
                  {businessName}
                </div>
                {serviceAreas && (
                  <div className="text-sm">
                    <span className="text-[hsl(var(--muted-foreground))]">
                      Service Areas:
                    </span>{" "}
                    {serviceAreas}
                  </div>
                )}
                {experience && (
                  <div className="text-sm">
                    <span className="text-[hsl(var(--muted-foreground))]">
                      Experience:
                    </span>{" "}
                    {experience}
                  </div>
                )}
              </div>
            )}

            {error && (
              <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentIdx === 0}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        {step === "review" ? (
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="gap-2"
          >
            {submitting ? "Submitting…" : "Submit for Verification"}{" "}
            <CheckCircle className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="gap-2"
          >
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
