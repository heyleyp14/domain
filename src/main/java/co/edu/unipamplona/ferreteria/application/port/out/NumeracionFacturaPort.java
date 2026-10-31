package co.edu.unipamplona.ferreteria.application.port.out;

/** Puerto de salida de numeración consecutiva de facturas, por año. */
public interface NumeracionFacturaPort {

    long siguienteSecuencia(int anio);
}
