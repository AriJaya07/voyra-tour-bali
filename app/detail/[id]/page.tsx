import Container from "@/components/Container";
import AboutDetail from "@/components/DetailProduct/AboutDetail";
import BannerDetail from "@/components/DetailProduct/BannerDetail";
import BookingUser from "@/components/DetailProduct/BookingUser";
import ExcpectDetail from "@/components/DetailProduct/ExpectDetail";
import Footer from "@/components/Footer";

export default function DetailPage() {
    return (
        <div className="">
            <BannerDetail />
            <Container>
                <AboutDetail />
                <BookingUser />
                <ExcpectDetail />
            </Container>
        </div>
    )
}