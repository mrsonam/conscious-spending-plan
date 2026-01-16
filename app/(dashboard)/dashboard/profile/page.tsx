"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { User, Mail, Calendar, Trash2, AlertTriangle } from "lucide-react"
import { ProfileSkeleton } from "@/components/skeletons/profile-skeleton"

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [resetting, setResetting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  const handleResetIncome = async () => {
    setResetting(true)
    setMessage(null)

    try {
      const response = await fetch("/api/income-entries", {
        method: "DELETE",
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ 
          type: "success", 
          text: `Successfully reset ${data.deletedCount} income ${data.deletedCount === 1 ? 'entry' : 'entries'}` 
        })
        setShowConfirm(false)
        // Refresh the page to update dashboard
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        setMessage({ type: "error", text: data.error || "Failed to reset income data" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred while resetting income data" })
    } finally {
      setResetting(false)
    }
  }

  if (status === "loading") {
    return (
      <>
        <Header title="Profile" />
        <div className="p-4 sm:p-6 max-w-2xl mx-auto">
          <ProfileSkeleton />
        </div>
      </>
    )
  }

  if (!session) return null

  return (
    <>
      <Header title="Profile" />
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your profile details and account settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-2xl font-semibold text-indigo-700">
                {session.user?.email
                  ? session.user.email
                      .split("@")[0]
                      .split(".")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)
                  : "U"}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {session.user?.name || "User"}
                </h3>
                <p className="text-sm text-gray-500">{session.user?.email}</p>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <div>
                  <div className="text-sm font-medium text-gray-500">Email</div>
                  <div className="text-sm text-gray-900">{session.user?.email}</div>
                </div>
              </div>

              {session.user?.name && (
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-500">Name</div>
                    <div className="text-sm text-gray-900">{session.user.name}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t">
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Data Management</h4>
              <div className="space-y-4">
                <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <h5 className="text-sm font-semibold text-red-900 mb-1">Reset Income Data</h5>
                      <p className="text-sm text-red-700 mb-3">
                        This will permanently delete all your income entries. This action cannot be undone.
                      </p>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setShowConfirm(true)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Reset Income Data
                      </Button>
                    </div>
                  </div>
                </div>
                {message && (
                  <div
                    className={`p-3 rounded-lg ${
                      message.type === "success"
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {message.text}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <ConfirmDialog
          open={showConfirm}
          onOpenChange={setShowConfirm}
          title="Reset All Income Data"
          description="Are you sure you want to delete all income entries? This action cannot be undone."
          confirmText="Yes, Delete All"
          cancelText="Cancel"
          onConfirm={handleResetIncome}
          variant="destructive"
        />
      </div>
    </>
  )
}
