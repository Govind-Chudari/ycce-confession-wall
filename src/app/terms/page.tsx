import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, Heart, Eye, AlertTriangle, CheckCircle, XCircle, Upload } from 'lucide-react'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-12">
          <Shield className="h-16 w-16 text-primary mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-3">Terms & Community Guidelines</h1>
          <p className="text-lg text-muted-foreground">
            Welcome to YCCE Confession Wall!
          </p>
        </div>

        <Card className="mb-8 border-primary/50 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold mb-2">Before You Start</h3>
                <p className="text-sm text-muted-foreground">
                  This platform is for YCCE students to express themselves anonymously and safely.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Heart className="h-6 w-6 text-blue-500" />
                <CardTitle>Purpose of This Platform</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-3">
                YCCE Confession Wall is a space for YCCE students to share their thoughts anonymously.
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Give you a voice to express yourself</li>
                <li>Connect with fellow students</li>
                <li>Build a supportive community</li>
                <li>Maintain a respectful environment</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-green-500" />
                <CardTitle>Who Can Use This Platform</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-3">This platform is exclusively for verified YCCE students:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li><strong>YCCE Email Required:</strong> Valid @ycce.in email address</li>
                <li><strong>ID Verification:</strong> Upload your college ID card</li>
                <li><strong>Admin Approval:</strong> Admins verify before granting access</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-yellow-500/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Eye className="h-6 w-6 text-purple-500" />
                <CardTitle>Understanding Anonymity</CardTitle>
              </div>
              <p className="text-sm text-yellow-600 dark:text-yellow-400 font-semibold mt-2">
                ⚠️ VERY IMPORTANT - Please Read Carefully
              </p>
            </CardHeader>
            <CardContent>
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4">
                <p className="text-sm">
                  Your posts appear anonymous to other students, but anonymity is NOT absolute.
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <h4 className="font-semibold">What Anonymous Means:</h4>
                  </div>
                  <ul className="list-disc list-inside text-sm space-y-1 ml-6">
                    <li>Other students cannot see your real name</li>
                    <li>You get a random anonymous username</li>
                    <li>Different names in different rooms</li>
                  </ul>
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <h4 className="font-semibold">What Anonymous Does NOT Mean:</h4>
                  </div>
                  <ul className="list-disc list-inside text-sm space-y-1 ml-6">
                    <li>Admins can see who posted (for investigations)</li>
                    <li>All admin access is logged</li>
                    <li>Illegal content can be reported</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-500" />
                <CardTitle>Allowed Content</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Personal experiences and feelings</li>
                <li>Confessions about college life</li>
                <li>Opinions on college events</li>
                <li>Supportive messages</li>
                <li>Funny stories</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-red-500/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <XCircle className="h-6 w-6 text-red-500" />
                <CardTitle>Prohibited Content</CardTitle>
              </div>
              <p className="text-sm text-red-600 dark:text-red-400 font-semibold mt-2">
                🚫 STRICTLY ENFORCED
              </p>
            </CardHeader>
            <CardContent>
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <h4 className="font-semibold text-red-600 dark:text-red-400 mb-2">Never Post:</h4>
                <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
                  <li>Hate speech or discrimination</li>
                  <li>Sexual content or nudity</li>
                  <li>Threats of violence</li>
                  <li>Targeted harassment</li>
                  <li>False accusations</li>
                  <li>Personal information</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Upload className="h-6 w-6 text-blue-500" />
                <CardTitle>Image Upload Rules</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-3">Images are manually reviewed before appearing</p>
              <div className="space-y-2">
                <div>
                  <h4 className="font-semibold mb-1">✅ Allowed:</h4>
                  <p className="text-sm ml-2">Memes, campus photos, artwork</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">❌ Prohibited:</h4>
                  <p className="text-sm ml-2">Nudity, violence, private conversations</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8 bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="pt-6 text-center">
            <Heart className="h-8 w-8 text-primary mx-auto mb-3" />
            <h3 className="text-xl font-bold mb-2">Thank You!</h3>
            <p className="text-muted-foreground">
              By following these guidelines, you help make YCCE Confession Wall safe for everyone.
            </p>
          </CardContent>
        </Card>

        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>Questions? Contact: <span className="text-primary">admin@ycce.in</span></p>
        </div>
      </div>
    </div>
  )
}