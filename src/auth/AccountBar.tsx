import { Link } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { USER_TYPE_LABELS } from "./miniApps";
import Avatar from "./Avatar";
import "./shell.css";

/** Top bar of every private page: the Uniquem mark (to the dashboard) and who you are (to your Profile, where Log out is). */
export default function AccountBar() {
  const { profile, type } = useAuth();
  return <nav className="ws-bar" aria-label="Account">
    <Link className="ws-bar-brand" to="/dashboard"><img src="/brand/uniquem-mark-180.png" alt="" width={36} height={36} /><span>Uniquem</span></Link>
    <div className="ws-bar-right">
      {profile && <Link className="ws-bar-me" to="/profile" aria-label={`Your profile: ${profile.firstName} ${profile.lastName}`}>
        <Avatar src={profile.thumbDataUrl} firstName={profile.firstName} lastName={profile.lastName} size={38} />
        <span className="ws-bar-name"><b>{profile.firstName} {profile.lastName}</b>{type && <small>{USER_TYPE_LABELS[type]}</small>}</span>
      </Link>}
    </div>
  </nav>;
}
