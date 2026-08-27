import { useSelector } from "react-redux";
import { Navigate, Outlet} from "react-router";

export default function IsAdmin(){
    const  { isAuthenticate, loading, user } = useSelector((state) => state.auth);


    if(loading)return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );

    if(!isAuthenticate || user.role!=="admin")return <Navigate to={"/"}/>;

    return <Outlet/>
}